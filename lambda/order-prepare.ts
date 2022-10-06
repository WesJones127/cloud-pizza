import { OrderStatus, ErrorSteps } from '../utils/enums';
import { IOrdersService, OrdersService } from '../services/orders-service';

export async function handler(event: any): Promise<any> {
    // if the requested error stage is in the "order rollback flow"
    // then we need to fail here so that we trigger a rollback
    if (event.errorOnStep == ErrorSteps.prepareOrder || event.errorOnStep >= ErrorSteps.refundPayment)
        throw new Error(`Simulating an exception in step: ${ErrorSteps.prepareOrder}`);

    const TABLE_NAME = process.env.TABLE_NAME || '';
    const ordersService: IOrdersService = new OrdersService(TABLE_NAME);    

    // update status to show we're preparing the order
    await ordersService.updateStatus(event.orderId, OrderStatus.CookingStarted, TABLE_NAME, event.perStepDelaySeconds);

    return {
        status: 'ok',
        paymentId: event.paymentId,
        loyaltyTransactionId: 'simulatedLoyaltytId',
        ...event
    }
}