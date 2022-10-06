import { ErrorSteps } from '../utils/enums';

export async function handler(event: any): Promise<any> {
    if (event.errorOnStep == ErrorSteps.addLoyaltyPoints)
        throw new Error(`Simulating an exception in step: ${ErrorSteps.addLoyaltyPoints}`);

    console.log(`simulating adding loyalty points to a customer account for paymentId: ${event.paymentId}`);

    return {
        status: "ok",
        paymentId: event.paymentId,
        loyaltyTransactionId: 'simulatedLoyaltytId',
        ...event
    }
}