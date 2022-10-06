import { Construct } from 'constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { createLambda } from '../../utils/cdk';
import { JsonPath } from 'aws-cdk-lib/aws-stepfunctions';
import { join } from 'path';

export interface OrderRollbackProps {
    workflowFailed: sfn.Fail,
    orderFailedFinalStep: sfn.Pass
}

/*
*  ROLLBACK FLOW
*
* The error handling flow will include refunding the payment to the user,
* and removing the loyalty points that were added to their account.
* This process will be sequential so that we don't remove loyalty points if we were not able to successfully refund the payment
*
*/
export class OrderRollback extends Construct {
    public readonly refundProcessChain: sfn.Chain;

    constructor(scope: Construct, id: string, props: OrderRollbackProps) {
        super(scope, id);

        const beginRefundProcess = new sfn.Pass(this, 'Begin Refund Process');
        const rollbackSuccess = new sfn.Pass(this, 'Rollback Was Successful');
        const rollbackFail = new sfn.Pass(this, 'Rollback Failed')
            .next(props.orderFailedFinalStep);



        // first step in the rollback process is to issue a payment refund
        const refundPaymentDLQ = new sqs.Queue(this, 'sqsRefundPayment');
        const refundPaymentDLQSendMessage = new tasks.SqsSendMessage(this, 'Refund Payment DLQ', {
            queue: refundPaymentDLQ,
            messageBody: sfn.TaskInput.fromObject({
                messageType: 'RefundPaymentFailed',
                payload: JsonPath.stringAt('$.Payload')
            })
            // ,
            // inputPath: '$.Error'
        })
            .next(rollbackFail);
        const paymentRefundProcessorLambda = createLambda(this, 'PaymentRefundProcessorLambda', join(__dirname, '../../lambda/payment-refund.ts'));
        // simulated Error state: 6
        const paymentRefundInvocation = new tasks.LambdaInvoke(this, 'Refund Payment (6)', {
            lambdaFunction: paymentRefundProcessorLambda,
            inputPath: '$.Payload',
            outputPath: '$.Payload',
            resultPath: '$.Payload'
        })
            .addRetry({ maxAttempts: 5, backoffRate: 1.1 })
            // use a DLQ if this step fails so that we can follow up later
            .addCatch(refundPaymentDLQSendMessage, {
                resultPath: '$.Error'
            });




        // if the payment refund succeeded, the next step is to remove any loyalty points that had been applied
        const removeLoyaltyPointsDLQ = new sqs.Queue(this, 'sqsRemoveLoyaltyPoints');
        const removeLoyaltyPointsDLQSendMessage = new tasks.SqsSendMessage(this, 'Remove Loyalty Points DLQ', {
            queue: removeLoyaltyPointsDLQ,
            messageBody: sfn.TaskInput.fromObject({
                messageType: 'RemoveLoyaltyPointsFailed',
                payload: JsonPath.stringAt('$.Payload')
            })
            // ,
            // inputPath: '$.Error'
        })
            .next(rollbackFail);
        const loyaltyPointsRemovalLambda = createLambda(this, 'LoyaltyPointsRemoveLambda', join(__dirname, '../../lambda/loyalty-reclaim.ts'));
        // simulated Error state: 7
        const loyaltyPointsRemovalInvocation = new tasks.LambdaInvoke(this, 'Remove Loyalty Points (7)', {
            lambdaFunction: loyaltyPointsRemovalLambda,
            inputPath: '$.Payload',
            outputPath: '$.Payload',
            resultPath: '$.Payload'
        })
            // use a DLQ if this step fails so that we can follow up later
            .addCatch(removeLoyaltyPointsDLQSendMessage, {
                resultPath: '$.Error'
            });




        // Notify the customer that something went wrong with their order
        const orderFailureNotificationLambda = createLambda(this, 'CustomerNotificationLambda', join(__dirname, '../../lambda/notify-customer.ts'));
        const orderFailureNotificationInvocation = new tasks.LambdaInvoke(this, 'Notify Customer - Order Failed', {
            lambdaFunction: orderFailureNotificationLambda
        });



        // group the rollback processes together
        this.refundProcessChain = sfn.Chain
            .start(beginRefundProcess)
            .next(paymentRefundInvocation)
            .next(loyaltyPointsRemovalInvocation)
            .next(rollbackSuccess)
            .next(props.orderFailedFinalStep)
            .next(orderFailureNotificationInvocation)
            .next(props.workflowFailed);

    }
}