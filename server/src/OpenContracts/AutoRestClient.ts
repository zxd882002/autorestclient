import EnvironmentConfigure from "../EnvironmentConfigures/EnvironmentConfigure";
import AutoRestClientStaticDecorator from "./AutoRestClientStaticDecorator";
import RequestResponseCollection from "./RequestResponseCollection";

export default class AutoRestClient {
    constructor(public environment: EnvironmentConfigure, public requestResponseCollection: RequestResponseCollection) {
        AutoRestClientStaticDecorator.autoRestClient = this;
    }
}