import * as HttpClient from './contract/HttpClient';
import { HttpRequest } from './contract/HttpRequest';
import { HttpResponse } from './contract/HttpResponse';

export class Engine {

    public async Execute(lines: string[]): Promise<string> {
        let httpRequest: HttpRequest = HttpClient.convertToHttpRequest(lines);
        HttpClient.executeScript(httpRequest.beforeScript);
        let response: HttpResponse = await HttpClient.send(httpRequest);
        console.log(response.body);
        HttpClient.executeScript(httpRequest.afterScript);
        let responseText: string = JSON.stringify(response, null, 4);
        return responseText;
    }
}