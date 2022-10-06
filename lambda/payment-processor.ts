import { errorSteps, OrderStatus } from '../utils/enums';
import { IOrdersService, OrdersService } from '../services/orders-service';

export async function handler(event: any): Promise<any> {
    if (event.errorOnStep == errorSteps.processPayment)
        throw new Error(`Simulating an exception in step: ${errorSteps.processPayment}`);

    const TABLE_NAME = process.env.TABLE_NAME || '';
    const ordersService: IOrdersService = new OrdersService(TABLE_NAME);

    // update status to show we're processing the payment
    await ordersService.updateStatus(event.orderId, OrderStatus.PaymentProcessing, TABLE_NAME, event.perStepDelaySeconds);

    console.log('simulate running the order thru a payment gateway');

    // update status to show the payment was successful
    await ordersService.updateStatus(event.orderId, OrderStatus.PaymentComplete, TABLE_NAME, event.perStepDelaySeconds);

    return {
        status: 'ok',
        paymentId: 'simulatedPaymentId',
        ...event
    };
}