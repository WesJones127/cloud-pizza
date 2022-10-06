import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { lambdaMemorySizes } from '../../utils/enums';
import { FunctionProps } from 'aws-cdk-lib/aws-lambda';

export interface ILambdaWithDynamoProps extends FunctionProps {
    dynamoDB: Table,
    memorySize: lambdaMemorySizes,
    logRetention: RetentionDays,
    timeout: Duration,
    handler: string
}

export class LambdaWithDynamo extends lambda.Function {
    public readonly func: lambda.Function;

    constructor(scope: Construct, id: string, props: ILambdaWithDynamoProps) {
        super(scope, id, props);

        this.func = new lambda.Function(scope, id, {
            code: props.code,
            handler: props.handler,
            runtime: props.runtime,
            timeout: props.timeout,
            memorySize: props.memorySize,
            logRetention: props.logRetention,
            environment: { TABLE_NAME: props.dynamoDB.tableName }
        });

        props.dynamoDB.grantReadWriteData(this.func);
    }
}