import { errorSteps } from '../utils/enums';
import * as AWS from 'aws-sdk';

export async function handler(event: any): Promise<any> {
    for (const record of event.Records) {
        const messageBody = JSON.parse(record.body);
        if (messageBody.payload.errorOnStep == errorSteps.processOrder)
            throw new Error(`Simulating an exception in step: ${errorSteps.processOrder}`);

        const taskToken = messageBody.taskToken;
        const params = {
            output: "\"Callback task completed successfully.\"",
            taskToken: taskToken
        };
        const stepfunctions = new AWS.StepFunctions();
        
        await stepfunctions.sendTaskSuccess(params).promise()
            .then(data => {
                console.log(data);
            }).catch(err => {
                console.error(err.message);
            });
    }
}