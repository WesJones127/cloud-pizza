import * as AWS from 'aws-sdk';

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
    let result = await db.get(params).promise();

    return { statusCode: 200, body: JSON.stringify(result) };        
  } catch (dbError) {
    console.log(dbError);
    return { statusCode: 500 };
  }
};
