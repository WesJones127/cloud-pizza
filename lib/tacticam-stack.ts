import * as cdk from 'aws-cdk-lib';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { OrderRollback } from './constructs/order-rollback-workflow';
import { PrePaymentFlow } from './constructs/pre-payment-workflow';
import { PostPaymentFlow } from './constructs/post-payment-workflow';
import { APIGateWay } from './constructs/api-gateway';

export interface TacticamStackProps extends cdk.StackProps {
  STATUS_CHECK_URL_PARAM: string;
  STATUS_CHECK_URL_PARAM_NULL_VALUE: string;
  DYNAMO_DB_TABLE_NAME: string;
}

export class TacticamStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TacticamStackProps) {
    super(scope, id, props);

    // create a database to store orders
    const dynamoTable = new Table(this, props.DYNAMO_DB_TABLE_NAME, {
      partitionKey: {
        name: 'orderId',
        type: AttributeType.NUMBER
      },
      tableName: props.DYNAMO_DB_TABLE_NAME,
      removalPolicy: RemovalPolicy.DESTROY  // clean everything up since this is a test
    });


    // set up a few states that will be shared with each section of this overall workflow
    const workflowFailed = new sfn.Fail(this, "Sorry, We Couldn't complete your order");
    const workflowSucceeded = new sfn.Succeed(this, 'Your pizza has been delivered!');
    const orderFailedFinalStep = new sfn.Pass(this, 'Order Failed');


    // create each section of the workflow individually
    // this just helps to keep the top level stack and process flow easier to read
    // the pre-payment flow is for states that will not require a rollback if they fail
    const prePaymentFlow = new PrePaymentFlow(this, 'Pre Payment Flow', {
      dynamoTable,
      orderFailedFinalStep
    });
    // the order rollback flow will refund payments and reclaim any loyalty points that were awarded
    const orderRollbackFlow = new OrderRollback(this, 'Order Rollback Flow', {
      workflowFailed,
      orderFailedFinalStep
    });
    // post-payment flow is for everything that would need to trigger a rollback upon failure
    const postPaymentFlow = new PostPaymentFlow(this, 'Post Payment Flow', {
      dynamoTable: dynamoTable,
      orderFailedFinalStep: orderFailedFinalStep,
      refundProcessChain: orderRollbackFlow.refundProcessChain
    });


    // put it all together!
    const definition = sfn.Chain
      .start(prePaymentFlow.orderInsertInvocation)
      .next(prePaymentFlow.paymentProcessorInvocation)
      .next(postPaymentFlow.paymentSuccessParallel)
      .next(workflowSucceeded);
      
    // create the step functions state machine
    let stateMachine = new sfn.StateMachine(this, 'OrderProcessingSaga', {
      definition,
      timeout: Duration.seconds(30)
    });
    stateMachine.grantTaskResponse(postPaymentFlow.orderProcessorLambda);


    // use an API gateway as the entry point to kick off the step function workflow
    const apig = new APIGateWay(this, 'API Gateway', {
      STATUS_CHECK_URL_PARAM: props.STATUS_CHECK_URL_PARAM,
      STATUS_CHECK_URL_PARAM_NULL_VALUE: props.STATUS_CHECK_URL_PARAM_NULL_VALUE,
      dynamoTable: dynamoTable,
      stateMachine: stateMachine
    });
  }
}
