import * as AWS from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';
import { OrderStatus } from '../utils/enums';

export interface IOrdersRepo {
    readonly TABLE_NAME: string;
    readonly DB: AWS.DynamoDB.DocumentClient;
    updateStatus(orderId: number, status: OrderStatus): Promise<PromiseResult<AWS.DynamoDB.DocumentClient.UpdateItemOutput, AWS.AWSError>>;
    createOrder(flavour: string, orderId: number, discount: OrderDiscount): Promise<PromiseResult<AWS.DynamoDB.DocumentClient.PutItemOutput, AWS.AWSError>>;
}

export type OrderDiscount = {
    discountApplied: number,
    discountReason: string
}

export class OrdersRepo implements IOrdersRepo {
    readonly TABLE_NAME: string;
    readonly DB: AWS.DynamoDB.DocumentClient;

    constructor(table_name: string) {
        this.TABLE_NAME = table_name;
        this.DB = new AWS.DynamoDB.DocumentClient({
            httpOptions: {
                connectTimeout: 5000,
                timeout: 5000
            },
            maxRetries: 3
        });
    }

    public async createOrder(flavour: string, orderId: number, discount: OrderDiscount): Promise<PromiseResult<AWS.DynamoDB.DocumentClient.PutItemOutput, AWS.AWSError>> {
        const params = {
            TableName: this.TABLE_NAME,
            Item: {
                orderId: orderId,
                status: OrderStatus.Pending,
                flavour: flavour,
                ...discount
            }
        };

        return await this.DB.put(params).promise();
    }

    public async updateStatus(orderId: number, status: OrderStatus): Promise<PromiseResult<AWS.DynamoDB.DocumentClient.UpdateItemOutput, AWS.AWSError>> {
        var params = {
            TableName: this.TABLE_NAME,
            Key: { orderId: orderId },
            UpdateExpression: 'set #s = :val',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: {
                ':val': status
            }
        };

        return this.DB.update(params).promise();
    }
}