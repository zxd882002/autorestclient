import * as HttpClient from './RequestHandlers/HttpClient';
import { HttpRequest } from './Contracts/HttpRequest';
import { HttpResponse } from './Contracts/HttpResponse';

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