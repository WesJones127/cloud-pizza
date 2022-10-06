import { delay } from 'utils/common';
import { errorSteps, stepFuncInput } from 'utils/enums';
import { IOrdersService, OrdersService } from 'services/orders-service';

export async function handler(event: stepFuncInput): Promise<any> {
    const TABLE_NAME = process.env.TABLE_NAME || 'orders';
    const ordersService: IOrdersService = new OrdersService(TABLE_NAME);

    if (event.errorOnStep == errorSteps.createOrder)
        throw new Error(`Simulating an exception in step: ${errorSteps.createOrder}`);

    await ordersService.createOrder(event.flavor, event.orderId)

    // just used for the demo, allows the user to see the status change slowly
    await delay(event.perStepDelaySeconds);

    return {
        status: "ok",
        ...event
    }


}