import { delay } from '../utils/common';
import { ErrorSteps, StepFuncInput } from '../utils/enums';
import { IOrdersRepo, OrdersRepo } from '../repositories/orders-repo';
import { IOrdersService, OrdersService } from '../services/orders-service';

var ordersRepo: IOrdersRepo;
var ordersService: IOrdersService;

export async function handler(event: StepFuncInput): Promise<any> {
    const TABLE_NAME = process.env.TABLE_NAME || 'orders';
    ordersRepo = new OrdersRepo(TABLE_NAME);
    ordersService = new OrdersService(ordersRepo);  

    if (event.errorOnStep == ErrorSteps.createOrder)
        throw new Error(`Simulating an exception in step: ${ErrorSteps.createOrder}`);

    await ordersService.createOrder(event.flavor, event.orderId)

    // just used for the demo, allows the user to see the status change slowly
    await delay(event.perStepDelaySeconds);

    return {
        status: "ok",
        ...event
    }


}