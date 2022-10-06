import { errorSteps } from '../utils/enums';

export async function handler(event: any): Promise<any> {
    if (event.errorOnStep == errorSteps.refundPayment)
        throw new Error(`Simulating an exception in step: ${errorSteps.refundPayment}`);

    console.log('simulating refunding the payment');

    return {
        status: 'ok',
        ...event
    }
}