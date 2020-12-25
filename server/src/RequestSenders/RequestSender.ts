import Request from "../Contracts/Request";
import Response from "../Contracts/Response";

export default interface RequestSender {
    send: (httpRequest: Request) => Promise<Response>;
}