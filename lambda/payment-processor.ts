import { ErrorSteps, OrderStatus } from '../utils/enums';
import { IOrdersRepo, OrdersRepo } from '../repositories/orders-repo';
import { IOrdersService, OrdersService } from '../services/orders-service';

var ordersRepo: IOrdersRepo;
var ordersService: IOrdersService;

export async function handler(event: any): Promise<any> {
    if (event.errorOnStep == ErrorSteps.processPayment)
        throw new Error(`Simulating an exception in step: ${ErrorSteps.processPayment}`);

    const TABLE_NAME = process.env.TABLE_NAME || '';
    ordersRepo = new OrdersRepo(TABLE_NAME);
    ordersService = new OrdersService(ordersRepo);  

    // update status to show we're processing the payment
    await ordersService.updateStatus(event.orderId, OrderStatus.PaymentProcessing, event.perStepDelaySeconds);

    console.log('simulate running the order thru a payment gateway');

    // update status to show the payment was successful
    await ordersService.updateStatus(event.orderId, OrderStatus.PaymentComplete, event.perStepDelaySeconds);

    return {
        status: 'ok',
        paymentId: 'simulatedPaymentId',
        ...event
    };
}