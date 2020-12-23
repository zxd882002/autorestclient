import EnvironmentConfigure from "../EnvironmentConfigures/EnvironmentConfigure";
import RequestResponseCollection from "./RequestResponseCollection";

export default class AutoRestClient {
    constructor(public environment: EnvironmentConfigure, public requests: RequestResponseCollection) { }
}