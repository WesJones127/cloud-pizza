import * as AWS from 'aws-sdk';
import { StepFunctions } from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { getParameter } from '../utils/ssm-parameters';
import { ErrorSteps } from '../utils/enums';

type inputType = {
    flavour: string,
    perStepDelaySeconds: number,
    errorOnStep: ErrorSteps
}

export async function handler(event: APIGatewayProxyEventV2): Promise<any> {
    const input = validateAndParseInput(event);
    const newOrderId = generateNewOrderId();
    const STATUS_CHECK_URL_PARAM = process.env.STATUS_CHECK_URL_PARAM || '';
    const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN || '';


    try {
        // begin the state machine workflow
        await startStateMachineExecutions(newOrderId, input);

        // generate a clickable URL for the user to check the status of their order
        let statusCheckUrl = await generateStatusCheckURL(newOrderId, event, STATUS_CHECK_URL_PARAM);

        // create the appropriate response based on whether we were able to generate a valid URL or not
        let response = generateResponseBody(statusCheckUrl);

        return { statusCode: 201, body: JSON.stringify(response) };

    } catch (error) {
        console.log(error);
        return { statusCode: 500, body: 'Your order could not be placed' };
    }

    function validateAndParseInput(event: APIGatewayProxyEventV2): inputType {
        
        var data = (!!event.body) ? JSON.parse(event.body ?? '') : '';

        if (!!data === false) {
            return {
                flavour: 'plain',
                perStepDelaySeconds: 0,
                errorOnStep: 0
            }
        }
        return {
            flavour: data.flavour ?? 'plain',
            perStepDelaySeconds: data.perStepDelaySeconds ?? 0,
            errorOnStep: data.errorOnStep ?? 0
        }
    }

    function generateNewOrderId(): number {
        // I'm using the current timestamp as an order ID generator for this demo.
        // Normally I would either use an auto-incrementing primary key in an RDBMS, or a GUID in a non-relational DB
        // But I need something that I can use in a URL quickly and easily, so I'm using a timestamp for this demo.
        // Please don't order 2 pizzas within the same millisecond!!! 
        return Date.now();
    }

    /**
     * First checks the Parameter Store to see if the base url for the API gateway was stored there
     * If not, grab the URL from the request context
     * If the AWS portal was used to make the API call, the URL in the request context will not be valid
     * 
     * @param orderId 
     * @param event 
     * @param paramName 
     * @returns 
     */
    async function generateStatusCheckURL(orderId: number, event: any, paramName: string): Promise<string> {
        // try to get the URL of the APIG from the AWS parameter store
        const urlBase = await getParameter(paramName);
        console.log(`urlBase: ${urlBase}`);

        if (isValidUrl(urlBase)) {
            console.log('URL Parameter found in system manager');
            // if we have a parameter with the URL base, use that
            return `${urlBase}orders/${orderId}`;
        } else {
            console.log('URL being generated from event object');
            // try to parse the url from the request object
            // note: this functionality will NOT work when calling the APIG route from the AWS Console
            // it will work if using Postman, curl, etc to call the APIG route
            return `https://${event.requestContext.domainName}${event.requestContext.path}/${orderId}`;
        }
    }

    function isValidUrl(url?: string): boolean {
        if (!url)
            return false;

        // just going with something simple for this demo
        var regexp = new RegExp('^(http|www)');
        return regexp.test(url);
    }

    function isApiGatewayTestUrl(url?: string): boolean {
        console.log('indexOf: ' + url?.indexOf('testPrefix.testDomainName'));
        return !!url && url.indexOf('testPrefix.testDomainName') >= 0;
    }

    function generateResponseBody(statusCheckUrl: string): any {
        // db insert succeeded if we got here
        let responseMessage = 'Order created successfully.';

        // if the API route is tested thru the AWS portal, it will use a fake URL that we can't use
        // in that case we won't provide a status check URL in the response to the user
        if (isApiGatewayTestUrl(statusCheckUrl) === false) {
            responseMessage += ' Use the statusCheck link to see how the order is going!';
        }

        return {
            message: responseMessage,
            orderId: newOrderId,
            statusCheck: statusCheckUrl
        };
    }

    async function startStateMachineExecutions(orderId: number, props: inputType) {
        const stepFunctions = new AWS.StepFunctions({
            region: process.env.AWS_REGION
        });

        // if we're running every error scenario at once (ErrorStep = 100)
        // then we'll run them all in parallel asynchronously
        var promises: Promise<PromiseResult<StepFunctions.StartExecutionOutput, AWS.AWSError>>[] = [];

        if (props.errorOnStep == ErrorSteps.ALL) {
            // start a new state machine execution for each possible error state (excluding ErrorSteps: ALL)
            let userCount = 0;
            for (var err in ErrorSteps) {
                if (!isNaN(Number(err)) && Number(err) != ErrorSteps.ALL) {
                    console.log(`adding error state: ${Number(err)}`);
                    // if we're going to automatically generate more than 1 order, we'll need a new order ID for each one
                    // we'll use the original orderId for the first one since it will get returned in the API response
                    let currentOrderId = (userCount === 0) ? orderId : generateNewOrderId();
                    userCount++;
                    promises.push(getExecutionPromise(currentOrderId, props, Number(err)));
                }
            }
        } else {
            console.log(`adding error state: ${props.errorOnStep}`);
            // start a single execution of the state machine
            promises = [getExecutionPromise(orderId, props, props.errorOnStep)];
        }

        // using Promise.all instead of Promise.allSettled so we'll throw an error if any of them fail
        return await Promise.all(promises);

        function getExecutionPromise(orderId: number, props: inputType, errorStep: number): Promise<PromiseResult<StepFunctions.StartExecutionOutput, AWS.AWSError>> {
            const StepFuncInput = {
                orderId: orderId,
                flavor: props.flavour,
                perStepDelaySeconds: props.perStepDelaySeconds,
                errorOnStep: errorStep
            };

            const params: StepFunctions.StartExecutionInput = {
                stateMachineArn: STATE_MACHINE_ARN,
                input: JSON.stringify(StepFuncInput)
            };

            // don't await it yet
            return stepFunctions.startExecution(params).promise();
        }
    }
}