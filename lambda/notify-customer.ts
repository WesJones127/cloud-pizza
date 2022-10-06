import { OrderStatus, ErrorSteps, StepFuncInput } from '../utils/enums';
import { IOrdersService, OrdersService } from '../services/orders-service';

export async function handler(event: any): Promise<any> {
    if (event.errorOnStep == ErrorSteps.reclaimLoyaltyPoints)
        throw new Error(`Simulating an exception in step: ${ErrorSteps.reclaimLoyaltyPoints}`);
        
    const TABLE_NAME = process.env.TABLE_NAME || '';
    const ordersService: IOrdersService = new OrdersService(TABLE_NAME);  

    console.log('Simulating a notification being sent to the customer');

    await ordersService.updateStatus(event.orderId, OrderStatus.Cancelled, TABLE_NAME, event.perStepDelaySeconds);
}