
import { OrderStatus, ErrorSteps } from '../utils/enums';
import { IOrdersRepo, OrdersRepo } from '../repositories/orders-repo';
import { IOrdersService, OrdersService } from '../services/orders-service';

var ordersRepo: IOrdersRepo;
var ordersService: IOrdersService;

export async function handler(event: any): Promise<any> {
    if (event.errorOnStep == ErrorSteps.refundPayment)
        throw new Error(`Simulating an exception in step: ${ErrorSteps.refundPayment}`);

    const TABLE_NAME = process.env.TABLE_NAME || '';
    ordersRepo = new OrdersRepo(TABLE_NAME);
    ordersService = new OrdersService(ordersRepo);  

    await ordersService.updateStatus(event.orderId, OrderStatus.PaymentFailed, event.perStepDelaySeconds);

    console.log('simulating refunding the payment');

    return {
        status: 'ok',
        ...event
    }
}