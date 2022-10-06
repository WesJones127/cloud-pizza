#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Tags } from 'aws-cdk-lib';
import { TactacamStack, TactacamStackProps } from '../lib/tactacam-stack';

const app = new cdk.App();

const tactacamStackProps: TactacamStackProps = {
    DYNAMO_DB_TABLE_NAME: 'orders',
    STATUS_CHECK_URL_PARAM: '/apig/baseUrl',
    STATUS_CHECK_URL_PARAM_NULL_VALUE: 'NOT SET',
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
};
const tactacamStack = new TactacamStack(app, 'TactacamStack', tactacamStackProps);
Tags.of(tactacamStack).add('ProductOwner', 'Wes Jones');