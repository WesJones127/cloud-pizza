import { setParameter } from 'utils/ssm.parameters';

export async function handler(event: any): Promise<any> {
    const paramKey = process.env.STATUS_CHECK_URL_PARAM || '/apig/baseUrl';
    const paramNotSetValue = process.env.STATUS_CHECK_URL_PARAM_NULL_VALUE || 'NOT SET';
    const paramValue = event?.ResourceProperties?.apiUrl ?? paramNotSetValue;

    return await setParameter(paramKey, paramValue);
}