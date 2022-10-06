import * as cdk from 'aws-cdk-lib';
import * as SSM from 'aws-cdk-lib/aws-ssm';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { createLambda, createLambdaWithDynamoAccess } from '../../utils/cdk';
import * as lambda from 'aws-cdk-lib/aws-lambda';


export interface APIGateWayProps {
    STATUS_CHECK_URL_PARAM: string,
    STATUS_CHECK_URL_PARAM_NULL_VALUE: string,
    dynamoTable: Table,
    stateMachine: StateMachine
}

/**
 * Set up an API Gateway with two routes and the Lambda functions to integrate with those routes:
 * - POST /order
 * - GET /order/{id}
 * 
 * Once the APIG has been deployed and a unique URL is generated, we'd like to grab that url and store it in a Parameter Store variable
 * This will allow us to generate a clickable URL that we can return in the response of the POST route to allow the user to check the status of their order
 */
export class APIGateWay extends Construct {
    public readonly orderProcessorLambda: lambda.Function;
    public readonly orderInsertInvocation: sfn.TaskStateBase;
    public readonly paymentProcessorInvocation: sfn.TaskStateBase;
    public readonly paymentSuccessParallel: sfn.Parallel;

    constructor(scope: Construct, id: string, props: APIGateWayProps) {
        super(scope, id);

        // order received lambda
        // triggered by the API gateway, will kick off the step function process
        let orderReceivedLambda = createLambdaWithDynamoAccess(this, 'OrderReceivedLambda', 'order-receive.handler', props.dynamoTable);
        orderReceivedLambda.addEnvironment('STATUS_CHECK_URL_PARAM', props.STATUS_CHECK_URL_PARAM);
        orderReceivedLambda.addEnvironment('STATE_MACHINE_ARN', props.stateMachine.stateMachineArn);
        props.stateMachine.grantStartExecution(orderReceivedLambda);


        // order status check lambda
        let orderGetLambda = createLambdaWithDynamoAccess(this, 'OrderGetLambda', 'order-get.handler', props.dynamoTable);


        // create an API Gateway
        const api = new RestApi(this, 'CloudPizza');

        // create the API routes and integrations
        const orders = api.root.addResource('orders');
        const orderById = orders.addResource('{id}');
        orders.addMethod('POST', new LambdaIntegration(orderReceivedLambda));
        orderById.addMethod('GET', new LambdaIntegration(orderGetLambda));


        // we want the API gateway route that kicks off the order process to return a URL that can be used to check the status of an order
        // in order to do that we need to get the auto-generated domain name for the APIG, but that's not available until the deployment is done
        // we'll trigger a custom resource that calls a lambda function to add the URL to a Parameter Store value in the Systems Manager
        let apiUrlSetterLambda = createLambda(this, 'ApiUrlSetterLambda', 'api-url-setter.handler');
        apiUrlSetterLambda.addEnvironment('STATUS_CHECK_URL_PARAM', props.STATUS_CHECK_URL_PARAM);
        apiUrlSetterLambda.addEnvironment('STATUS_CHECK_URL_PARAM_NULL_VALUE', props.STATUS_CHECK_URL_PARAM_NULL_VALUE);

        // create a placeholder value in the Parameter Store for the auto-generated API Gateway URL
        const paramStore = new SSM.StringParameter(this, 'ApiUrlParameter', {
            parameterName: props.STATUS_CHECK_URL_PARAM,
            description: 'Base URL for the APIG.  Used for constructing status check URLs',
            stringValue: props.STATUS_CHECK_URL_PARAM_NULL_VALUE,
            tier: SSM.ParameterTier.STANDARD
        });
        paramStore.grantRead(orderReceivedLambda);
        paramStore.grantWrite(apiUrlSetterLambda);

        // use a custom resource to call a lambda function that will set the correct API URL in the Parameter Store
        // const provider = new cr.Provider(this, 'crProvider', {
        //     onEventHandler: apiUrlSetterLambda
        // });
        // new cdk.CustomResource(this, 'RegisterApi', {
        //     serviceToken: provider.serviceToken,
        //     properties: {
        //         apiUrl: api.url
        //     }
        // });
    }
}