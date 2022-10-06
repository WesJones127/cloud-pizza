# AWS Step Functions sample project

This project uses the AWS CDK to deploy a state machine that simulates an online pizza ordering process.  

## To get started:
* `npm install`     install dependencies
* `npm run build`   compile typescript to js
* `npm run test`    perform the jest unit tests
* `cdk synth`       emits the synthesized CloudFormation template
* `cdk deploy`      deploy this stack to your default AWS account/region


## How to test:
There are 2 API routes you can call:
- The first is a POST route to `/orders` to start a new order.  The request body has the following parameters.  All are optional, defaults will be used in not supplied.
```
{
    flavour?: string,               // the style of pizza you want, we recommend Pinapple
    perStepDelaySeconds?: number,   // this will force a delay in each stage of the workflow, useful if you want to use the get route to check on status changes
    errorOnStep?: number            // force the workflow to error at a specific stage so that you can test each error state
}
```

Options for `errorOnStep`:


- The second is a GET route to `/orders/{id}` to check the status of an order.

