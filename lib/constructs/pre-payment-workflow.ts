import { Construct } from 'constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { createLambdaWithDynamoAccess } from '../../utils/cdk';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { join } from 'path';

export interface PrePaymentFlowProps {
    dynamoTable: Table,
    orderFailedFinalStep: sfn.Pass
}

/** 
*
* PRE-PAYMENT FLOW
*
* Failures during this stage do not require a rollback scenario.
* We'll jump to a common "Order Failed" state that will notify the customer, but there's no other data cleanup to be done here.
* We can monitor logs for failure counts and reasons.
*
*/
export class PrePaymentFlow extends Construct {
    public readonly orderInsertInvocation: sfn.TaskStateBase;
    public readonly paymentProcessorInvocation: sfn.TaskStateBase;

    constructor(scope: Construct, id: string, props: PrePaymentFlowProps) {
        super(scope, id);

        // order creation lambda,  adds new order records to the database
        // simulated Error state: 1
        const orderInsertLambda = createLambdaWithDynamoAccess(this, 'OrderInsertLambda', join(__dirname, '../../lambda/order-insert.ts'), props.dynamoTable);
        this.orderInsertInvocation = new tasks.LambdaInvoke(this, 'Create New Order (1)', {
            lambdaFunction: orderInsertLambda
        })
            .addRetry({ maxAttempts: 3 })
            .addCatch(props.orderFailedFinalStep);


        // payment processor lambda
        // simulated Error state: 2
        const paymentProcessorLambda = createLambdaWithDynamoAccess(this, 'PaymentProcessorLambda', join(__dirname, '../../lambda/payment-processor.ts'), props.dynamoTable);
        this.paymentProcessorInvocation = new tasks.LambdaInvoke(this, 'Process Payment (2)', {
            lambdaFunction: paymentProcessorLambda,
            inputPath: '$.Payload',
            outputPath: '$.Payload',
            resultPath: '$.Payload'
        })
            .addRetry({ maxAttempts: 0 })
            .addCatch(props.orderFailedFinalStep);
    }
}
