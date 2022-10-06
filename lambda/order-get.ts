import * as AWS from 'aws-sdk';
import { OrderStatus } from '../utils/enums';

export const handler = async (event: any): Promise<any> => {
  const requestedItemId: number = Number(event.pathParameters.id);
  if (!requestedItemId) {
    return { statusCode: 400, body: `Error: You are missing the path parameter id` };
  }

  const TABLE_NAME = process.env.TABLE_NAME || '';
  const params = {
    TableName: TABLE_NAME,
    Key: { 'orderId': requestedItemId }
  };
  const db = new AWS.DynamoDB.DocumentClient();

  try {
    let result = await db.get(params).promise()
      .then(data => {
        let discount = '0%';
        let status = 'unknown';

        if (data.Item?.discountApplied > 0)
          discount = `${data.Item?.discountApplied * 100}%`;

        if (!!data.Item?.status)
          status = OrderStatus[data.Item?.status];

        return {
          ...data.Item,
          discountApplied: discount,
          status: status
        };
      });

    return { statusCode: 200, body: JSON.stringify(result) };

  } catch (dbError) {
    console.log(dbError);
    return { statusCode: 500 };
  }
};
