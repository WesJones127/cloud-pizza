import * as AWS from 'aws-sdk';
import { delay } from '../utils/common';
import { OrderStatus } from '../utils/enums';

export interface IOrdersService {
    readonly TABLE_NAME: string;
    readonly db: AWS.DynamoDB.DocumentClient;
    createOrder(flavour: string, orderId: number): Promise<number>;
    updateStatus(orderId: number, status: OrderStatus, tableName: string, delaySeconds: number): Promise<any>;
}

export class OrdersService implements IOrdersService {
    readonly TABLE_NAME: string;
    readonly db: AWS.DynamoDB.DocumentClient;

    constructor(table_name: string) {
        this.TABLE_NAME = table_name;
        this.db = new AWS.DynamoDB.DocumentClient();
    }


    public async createOrder(flavour: string, orderId: number): Promise<number> {
        const discount = this.calculateDiscount(flavour);
        const params = {
            TableName: this.TABLE_NAME,
            Item: {
                orderId: orderId,
                status: OrderStatus.Pending,
                flavour: flavour,
                ...discount
            }
        };

        const result = await this.db.put(params).promise()
        .then(data => {
            console.log(data);
        });
        console.log(result);

        return params.Item;
    }

    private calculateDiscount(flavour: string): any {
        let response = {
            discountApplied: 0,
            discountReason: ''
        }

        if (flavour == 'pineapple' || flavour == 'hawaiian') {
            response.discountApplied = .20;
            response.discountReason = 'You like pineapple, you\'re one of us!';
        }

        return response;
    }

    public async updateStatus(orderId: number, status: OrderStatus, tableName: string, delaySeconds: number): Promise<any> {
        console.log(`updating orderId: ${orderId} to status: ${status}`);
        try {
            var params = {
                TableName: tableName,
                Key: { orderId: orderId },
                UpdateExpression: 'set #s = :val',
                ExpressionAttributeNames: { '#s': 'status' },
                ExpressionAttributeValues: {
                    ':val': status
                }
            };

            const db = new AWS.DynamoDB.DocumentClient({
                httpOptions: {
                    connectTimeout: 5000,
                    timeout: 5000
                },
                maxRetries: 3
            });

            await db.update(params)
                .promise()
                .then(async data => {
                    console.log(data);
                    await delay(delaySeconds);
                });
            return {
                status: 'ok'
            };
        } catch (error) {
            // we don't want to throw errors when updating order status
            // if this fails it won't be the end of the world
            // the order can continue processing and the status might get updated once the next step is complete
        }
    }
}