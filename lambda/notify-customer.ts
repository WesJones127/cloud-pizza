import { errorSteps, stepFuncInput } from '../utils/enums';

export async function handler(event: any): Promise<any> {
    if (event.errorOnStep == errorSteps.reclaimLoyaltyPoints)
        throw new Error(`Simulating an exception in step: ${errorSteps.reclaimLoyaltyPoints}`);

    console.log('Simulating a notification being sent to the customer');
}