import { errorSteps } from 'utils/enums';

export async function handler(event: any): Promise<any> {
    if (event.errorOnStep == errorSteps.addLoyaltyPoints)
        throw new Error(`Simulating an exception in step: ${errorSteps.addLoyaltyPoints}`);

    console.log(`simulating adding loyalty points to a customer account for paymentId: ${event.paymentId}`);

    return {
        status: "ok",
        paymentId: event.paymentId,
        loyaltyTransactionId: 'simulatedLoyaltytId',
        ...event
    }
}