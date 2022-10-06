#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Tags } from 'aws-cdk-lib';
import { TacticamStack, TacticamStackProps } from '../lib/tacticam-stack';

const app = new cdk.App();
//new cdk.Stack(app, 'test');

const tacticamStackProps: TacticamStackProps = {
    DYNAMO_DB_TABLE_NAME: 'orders',
    STATUS_CHECK_URL_PARAM: '/apig/baseUrl',
    STATUS_CHECK_URL_PARAM_NULL_VALUE: 'NOT SET',
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
};
const tacticamStack = new TacticamStack(app, 'TacticamStack', tacticamStackProps);
Tags.of(tacticamStack).add('ProductOwner', 'Wes Jones');