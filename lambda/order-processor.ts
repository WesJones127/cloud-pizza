import * as AWS from 'aws-sdk';
import { OrderStatus, ErrorSteps } from '../utils/enums';
import { IOrdersService, OrdersService } from '../services/orders-service';

export async function handler(event: any): Promise<any> {
    const TABLE_NAME = process.env.TABLE_NAME || '';
    const ordersService: IOrdersService = new OrdersService(TABLE_NAME);

    for (const record of event.Records) {
        console.log(record);
        const messageBody = JSON.parse(record.body);

        if (messageBody.payload.errorOnStep == ErrorSteps.processOrder)
            throw new Error(`Simulating an exception in step: ${ErrorSteps.processOrder}`);


        console.log('set status to delivered');
        await ordersService.updateStatus(event.orderId, OrderStatus.DeliveryConfirmed, TABLE_NAME, event.perStepDelaySeconds);

        const taskToken = messageBody.taskToken;
        const params = {
            output: "\"Callback task completed successfully.\"",
            taskToken: taskToken
        };
        const stepfunctions = new AWS.StepFunctions();

        await stepfunctions.sendTaskSuccess(params).promise()
            .then(async data => {
                console.log(data);
            }).catch(err => {
                console.error(err.message);
            });

    }
}