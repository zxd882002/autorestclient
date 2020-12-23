import { Request } from "../OpenContracts/Request";
import { Response } from "../OpenContracts/Response";

export default interface RequestSender {
    send: (httpRequest: Request) => Promise<Response>;
}