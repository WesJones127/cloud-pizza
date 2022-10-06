import { OrderStatus, ErrorSteps } from '../utils/enums';
import { IOrdersRepo, OrdersRepo } from '../repositories/orders-repo';
import { IOrdersService, OrdersService } from '../services/orders-service';

var ordersRepo: IOrdersRepo;
var ordersService: IOrdersService;

export async function handler(event: any): Promise<any> {
    // if the requested error stage is in the "order rollback flow"
    // then we need to fail here so that we trigger a rollback
    if (event.errorOnStep == ErrorSteps.prepareOrder || event.errorOnStep >= ErrorSteps.refundPayment)
        throw new Error(`Simulating an exception in step: ${ErrorSteps.prepareOrder}`);

    const TABLE_NAME = process.env.TABLE_NAME || '';
    ordersRepo = new OrdersRepo(TABLE_NAME);
    ordersService = new OrdersService(ordersRepo);    

    // update status to show we're preparing the order
    await ordersService.updateStatus(event.orderId, OrderStatus.CookingStarted, event.perStepDelaySeconds);

    return {
        status: 'ok',
        paymentId: event.paymentId,
        loyaltyTransactionId: 'simulatedLoyaltytId',
        ...event
    }
}