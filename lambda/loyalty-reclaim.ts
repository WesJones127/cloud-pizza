import { ErrorSteps } from '../utils/enums';

export async function handler(event: any): Promise<any> {
    if (event.errorOnStep == ErrorSteps.reclaimLoyaltyPoints)
        throw new Error(`Simulating an exception in step: ${ErrorSteps.reclaimLoyaltyPoints}`);

    console.log('simulating removing loyalty points from a customer account');
    
    return {
        status: 'ok',
        ...event
    }
}