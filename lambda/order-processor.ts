import * as AWS from 'aws-sdk';
import { OrderStatus, ErrorSteps } from '../utils/enums';
import { IOrdersRepo, OrdersRepo } from '../repositories/orders-repo';
import { IOrdersService, OrdersService } from '../services/orders-service';

var ordersRepo: IOrdersRepo;
var ordersService: IOrdersService;

export async function handler(event: any): Promise<any> {
    const TABLE_NAME = process.env.TABLE_NAME || '';
    ordersRepo = new OrdersRepo(TABLE_NAME);
    ordersService = new OrdersService(ordersRepo);

    for (const record of event.Records) {
        const messageBody = JSON.parse(record.body);
        const payload = messageBody.payload;

        if (payload.errorOnStep == ErrorSteps.processOrder){
            throw new Error(`Simulating an exception in step: ${ErrorSteps.processOrder}`);
        }

        console.log('set status to delivered');
        await ordersService.updateStatus(payload.orderId, OrderStatus.DeliveryConfirmed, payload.perStepDelaySeconds);

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

        return { status: 'ok' }
    }
}