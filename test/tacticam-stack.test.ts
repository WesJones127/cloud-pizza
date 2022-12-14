import * as cdk from 'aws-cdk-lib';
import * as Tactacam from '../lib/tactacam-stack';
import { Template } from 'aws-cdk-lib/assertions';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/tactacam-stack.ts
test('Stack Created', () => {
  const app = new cdk.App();
    // WHEN
  const stack = new Tactacam.TactacamStack(app, 'MyTestStack', {STATUS_CHECK_URL_PARAM: 'url', STATUS_CHECK_URL_PARAM_NULL_VALUE: 'NOT SET', DYNAMO_DB_TABLE_NAME: 'orders'});
    // THEN
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::DynamoDB::Table', {
    "KeySchema": [
        {
          "AttributeName": "orderId",
          "KeyType": "HASH"
        }
      ]
  });
  
  template.hasResourceProperties('AWS::ApiGateway::RestApi', {
    "Name": "CloudPizza"
  });
});
