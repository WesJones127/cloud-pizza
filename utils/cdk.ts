import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { IConstruct } from 'constructs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { LambdaMemorySizes } from './enums';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';


export function createLambda(scope: IConstruct, id: string, entry: string): lambda.NodejsFunction {
    return new lambda.NodejsFunction(scope, id, {
        entry: entry,
        handler: 'handler',
        runtime: Runtime.NODEJS_16_X,
        memorySize: LambdaMemorySizes.s,
        timeout: Duration.seconds(10),
        logRetention: RetentionDays.ONE_DAY,
        bundling: {
            minify: true,
            sourceMap: true,
            sourceMapMode: lambda.SourceMapMode.INLINE,
            sourcesContent: false,
            target: 'es2020',
            keepNames: true,
            metafile: true
        }
    });
}

export function createLambdaWithDynamoAccess(scope: IConstruct, id: string, entry: string, table: Table): lambda.NodejsFunction {
    let fn = new lambda.NodejsFunction(scope, id, {
        entry: entry,
        handler: 'handler',
        memorySize: LambdaMemorySizes.s,
        logRetention: RetentionDays.ONE_DAY,
        timeout: Duration.seconds(10),
        runtime: Runtime.NODEJS_16_X,
        environment: {
            TABLE_NAME: table.tableName
        }
    });
    table.grantReadWriteData(fn);

    return fn;
}