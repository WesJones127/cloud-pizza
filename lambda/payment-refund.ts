
import { OrderStatus, ErrorSteps } from '../utils/enums';
import { IOrdersService, OrdersService } from '../services/orders-service';

export async function handler(event: any): Promise<any> {
    if (event.errorOnStep == ErrorSteps.refundPayment)
        throw new Error(`Simulating an exception in step: ${ErrorSteps.refundPayment}`);

    const TABLE_NAME = process.env.TABLE_NAME || '';
    const ordersService: IOrdersService = new OrdersService(TABLE_NAME);

    await ordersService.updateStatus(event.orderId, OrderStatus.PaymentFailed, TABLE_NAME, event.perStepDelaySeconds);

    console.log('simulating refunding the payment');

    return {
        status: 'ok',
        ...event
    }
}