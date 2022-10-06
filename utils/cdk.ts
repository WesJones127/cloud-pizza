import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { IConstruct } from 'constructs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { lambdaMemorySizes } from './enums';
import * as lambda from 'aws-cdk-lib/aws-lambda';


export function createLambda(scope: IConstruct, id: string, handler: string): lambda.Function {
    return new lambda.Function(scope, id, {
        code: lambda.Code.fromAsset('lambda'),
        handler: handler,
        runtime: Runtime.NODEJS_16_X,
        memorySize: lambdaMemorySizes.s,
        timeout: Duration.seconds(10),
        logRetention: RetentionDays.ONE_DAY
    });
}

export function createLambdaWithDynamoAccess(scope: IConstruct, id: string, handler: string, table: Table): lambda.Function {
    let fn = new lambda.Function(scope, id, {
            memorySize: lambdaMemorySizes.s,
            logRetention: RetentionDays.ONE_DAY,
            timeout: Duration.seconds(10),
            handler: handler,
            runtime: lambda.Runtime.NODEJS_16_X,
            code: lambda.Code.fromAsset('lambda'),
            environment: {
                TABLE_NAME: table.tableName
            }
        }); 
    table.grantReadWriteData(fn);

    return fn;
}