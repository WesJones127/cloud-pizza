import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { createLambda, createLambdaWithDynamoAccess } from '../../utils/cdk';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { JsonPath } from 'aws-cdk-lib/aws-stepfunctions';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { join } from 'path';
import { Duration } from 'aws-cdk-lib';

export interface PostPaymentFlowProps {
    dynamoTable: Table,
    orderFailedFinalStep: sfn.Pass,
    refundProcessChain: sfn.Chain
}

/**
 * 
 * POST-PAYMENT FLOW
 *  
 * This is an example of a parallel flow, we can prepare the food and award loyalty points to the customer asynchronously.
 * If the food CAN'T be made, we move to a rollback scenario where we refund the payment and reclaim the loyalty points (if they were added successfully).
 * If the food CAN be made, but adding loyalty points fails, we let the order continue and we put a message in a DLQ so the loyalty points issue can be recitified later.
 * 
 */
export class PostPaymentFlow extends Construct {
    public readonly orderProcessorLambda: lambda.NodejsFunction;
    public readonly orderInsertInvocation: sfn.TaskStateBase;
    public readonly paymentProcessorInvocation: sfn.TaskStateBase;
    public readonly paymentSuccessParallel: sfn.Parallel;

    constructor(scope: Construct, id: string, props: PostPaymentFlowProps) {
        super(scope, id);


        // loyalty points processes:
        const addLoyaltyPointsDLQ = new sqs.Queue(this, 'AddLoyaltyPointsDLQ');
        const addLoyaltyPointsDLQSendMessage = new tasks.SqsSendMessage(this, 'Add Loyalty Points DLQ', {
            queue: addLoyaltyPointsDLQ,
            messageBody: sfn.TaskInput.fromObject({
                messageType: 'AddLoyaltyPointsFailed',
                payload: JsonPath.stringAt('$.Payload')
            })
        });

        // simulated Error state: 3
        const loyaltyInsertInvocation = new tasks.LambdaInvoke(this, 'Add Loyalty Points To Customer Record (3)', {
            lambdaFunction: createLambda(this, 'LoyaltyInsertLambda', join(__dirname, '../../lambda/loyalty-insert.ts')),
            inputPath: '$.Payload',
            outputPath: '$.Payload',
            resultPath: '$.Payload'
        })
            // skipping retries since it's just simulated and we need to test the error path
            .addRetry({ maxAttempts: 0 })
            // add a catch so that the parallel process does not fail
            .addCatch(addLoyaltyPointsDLQSendMessage, {
                resultPath: '$.Error'
            });




        // begin the order preparation process:
        const orderBeginPrepLambda = createLambdaWithDynamoAccess(this, 'OrderPrepareLambda', join(__dirname, '../../lambda/order-prepare.ts'), props.dynamoTable);
        // simulated Error state: 4
        const orderBeginPrepInvocation = new tasks.LambdaInvoke(this, 'Begin Order Preparation (4)', {
            lambdaFunction: orderBeginPrepLambda,
            inputPath: '$.Payload',
            outputPath: '$.Payload',
            resultPath: '$.Payload'
        }).addRetry({ maxAttempts: 0 });

        // use a Wait State and an SQS queue for orders in progress
        // this allows the Order Preparation task to wait on a callback to tell us when the order is complete
        // process will timeout if callback not received promptly, allowing us to initiate a rollback

        // NOTE: I wanted to split the order processor into multiple stages (roll dough, apply toppings, cook pizza, out for delivery, etc)
        // but this demo is already getting long and splitting those steps out would not show additional functionality that's not already being utilized elsewhere 
        const ordersQueue = new sqs.Queue(this, 'PrepareOrderQueue', {
            visibilityTimeout: Duration.seconds(10),
            retentionPeriod: Duration.seconds(60)
        });
        this.orderProcessorLambda = createLambdaWithDynamoAccess(this, 'OrderProcessorLambda', join(__dirname, '../../lambda/order-processor.ts'), props.dynamoTable);
        this.orderProcessorLambda.addEventSource(new SqsEventSource(ordersQueue));

        // simulated Error state: 5
        const orderPrepareSendMessage = new tasks.SqsSendMessage(this, 'Wait on food to be cooked and delivered (5)', {
            queue: ordersQueue,
            messageBody: sfn.TaskInput.fromObject({
                messageType: 'PrepareOrder',
                taskToken: JsonPath.taskToken,
                payload: JsonPath.stringAt('$')
            }),
            integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
            heartbeat: cdk.Duration.seconds(10),  // we won't wait forever for a callback, fail the process if we don't hear back quickly
            inputPath: '$.Payload',
            outputPath: '$.Payload',
            resultPath: '$.Payload'
        });



        // parallel tasks for completing the order and adding loyalty points to the user's account
        // loyalty point failures will not fail the Parallel operation, but pizza failures will
        this.paymentSuccessParallel = new sfn.Parallel(this, 'Payment Processed')
            .branch(loyaltyInsertInvocation)
            .branch(orderBeginPrepInvocation.next(orderPrepareSendMessage))
            .addCatch(props.refundProcessChain, {
                resultPath: '$.Error'
            });
    }
}