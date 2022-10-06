import { OrderStatus, ErrorSteps, StepFuncInput } from '../utils/enums';
import { IOrdersRepo, OrdersRepo } from '../repositories/orders-repo';
import { IOrdersService, OrdersService } from '../services/orders-service';

var ordersRepo: IOrdersRepo;
var ordersService: IOrdersService;

export async function handler(event: any): Promise<any> {
    if (event.errorOnStep == ErrorSteps.reclaimLoyaltyPoints)
        throw new Error(`Simulating an exception in step: ${ErrorSteps.reclaimLoyaltyPoints}`);
        
    const TABLE_NAME = process.env.TABLE_NAME || '';
    ordersRepo = new OrdersRepo(TABLE_NAME);
    ordersService = new OrdersService(ordersRepo);  

    console.log('Simulating a notification being sent to the customer');

    await ordersService.updateStatus(event.orderId, OrderStatus.Cancelled, event.perStepDelaySeconds);
}