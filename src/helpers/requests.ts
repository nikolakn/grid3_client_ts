import { default as axios, Method } from "axios";

async function send(method: Method, url: string, body: string, headers: Record<string, string>): Promise<Record<string, unknown>> {
    const options = {
        method: method,
        url: url,
        data: body,
        headers: headers,
    };
    const response = await axios(options);
    if (response.status !== 200) {
        throw Error(`http request failed with status code: ${response.status} due to: ${response.data}`);
    }
    return response.data;
}
export { send };
