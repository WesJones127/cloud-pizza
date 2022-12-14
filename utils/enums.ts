export enum OrderStatus {
    Pending = 1,
    PaymentProcessing = 2,
    PaymentComplete = 3,
    CookingStarted = 4,
    CookingCompleted = 5,
    DeliveryStarted = 6,
    DeliveryConfirmed = 7,
    PaymentFailed = 8,
    Cancelled = 9
}

export enum ErrorSteps {
    'none' = 0,
    'createOrder' = 1,
    'processPayment' = 2,
    'addLoyaltyPoints' = 3,
    'prepareOrder' = 4,
    'processOrder' = 5,
    'refundPayment' = 6,
    'reclaimLoyaltyPoints' = 7,
    'ALL' = 100
}

export enum LambdaMemorySizes {
    's' = 128,
    'm' = 256,
    'l' = 512,
    'xl' = 1024
}

export type StepFuncInput = {
    orderId: number,
    flavor: string,
    perStepDelaySeconds: number,
    errorOnStep: number
};