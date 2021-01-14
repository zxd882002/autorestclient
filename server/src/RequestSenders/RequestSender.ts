import AutoRestClientRequest from "../Contracts/AutoRestClientRequest";
import AutoRestClientResponse from "../Contracts/AutoRestClientResponse";

export default interface RequestSender {
    send(httpRequest: AutoRestClientRequest): Promise<AutoRestClientResponse>;
    cancel(): void;
}