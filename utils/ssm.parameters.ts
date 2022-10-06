import { SSM } from "aws-sdk";

const getParameterWorker = async (name: string, decrypt: boolean): Promise<string | undefined> => {
    const ssm = new SSM();
    const result = await ssm
        .getParameter({ Name: name, WithDecryption: decrypt })
        .promise();

    return (result?.Parameter?.Value) ?? undefined;
}

const setParameterWorker = async (name: string, value: string): Promise<any> => {
    const ssm = new SSM();
    const paramRequest: SSM.PutParameterRequest = {
        Name: name,
        Value: value,
        Overwrite: true,
        Type: 'String'
    };
    const result = await ssm.putParameter(paramRequest, function (err, data) {
        if (err) console.log(err, err.stack);
        else console.log(data);
    }).promise();

    return;
}


export const getParameter = async (name: string): Promise<string | undefined> => {
    return getParameterWorker(name, false);
}

export const getEncryptedParameter = async (name: string): Promise<string | undefined> => {
    return getParameterWorker(name, true);
}

export const setParameter = async (name: string, value: string): Promise<any> => {
 return setParameterWorker(name, value);
}