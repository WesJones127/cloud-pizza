import { errorSteps } from 'utils/enums';

export async function handler(event: any): Promise<any> {
    if (event.errorOnStep == errorSteps.reclaimLoyaltyPoints)
        throw new Error(`Simulating an exception in step: ${errorSteps.reclaimLoyaltyPoints}`);

    console.log('simulating removing loyalty points from a customer account');
    
    return {
        status: 'ok',
        ...event
    }
}