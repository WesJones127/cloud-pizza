import { OrdersService } from '../../services/orders-service';
import { OrdersRepo } from '../../repositories/orders-repo';
import { OrderStatus } from '../../utils/enums';
import { mocked } from 'ts-jest/utils'
import AWS = require('aws-sdk');

jest.mock("aws-sdk", () => {
    return {
        DynamoDB: {
            DocumentClient: jest.fn(),
        },
    };
});


describe('OrdersService tests', () => {
    let createMocked: jest.Mock;
    let createPromiseMocked: jest.Mock;
    let updateMocked: jest.Mock;
    let updatePromiseMocked: jest.Mock;

    beforeEach(() => {
        createMocked = jest.fn();
        createPromiseMocked = jest.fn();
        updateMocked = jest.fn();
        updatePromiseMocked = jest.fn();
        createMocked.mockReturnValue({ promise: createPromiseMocked, });
        updateMocked.mockReturnValue({ promise: updatePromiseMocked, });

        mocked(AWS.DynamoDB.DocumentClient).mockImplementation(() => {
            return { put: createMocked, update: updateMocked } as unknown as AWS.DynamoDB.DocumentClient;
        });
    });

    test('pineapple discount applied', () => {
        let mockRepo = new OrdersRepo('table_name');
        let ordersService = new OrdersService(mockRepo);

        let discount = ordersService.calculateDiscount('PineApple');

        expect(discount.discountApplied).toBeGreaterThan(0);
    });
    test('hawaiian discount applied', () => {
        let mockRepo = new OrdersRepo('table_name');
        let ordersService = new OrdersService(mockRepo);

        let discount = ordersService.calculateDiscount('hawaIIan');

        expect(discount.discountApplied).toBeGreaterThan(0);
    });
    test('discount not applied', () => {
        let mockRepo = new OrdersRepo('table_name');
        let ordersService = new OrdersService(mockRepo);

        let discount = ordersService.calculateDiscount('other');

        expect(discount.discountApplied).toEqual(0);
    });
    test('can create new Order', async () => {
        let mockRepo = new OrdersRepo('table_name');
        let ordersService = new OrdersService(mockRepo);

        await expect(ordersService.createOrder('anyFlavour', 123)).resolves.not.toThrow();
    });
    test('can update existing Order', async () => {
        let mockRepo = new OrdersRepo('table_name');
        let ordersService = new OrdersService(mockRepo);

        await expect(ordersService.updateStatus(123, OrderStatus.PaymentComplete, 0)).resolves.not.toThrow();
    });
});
