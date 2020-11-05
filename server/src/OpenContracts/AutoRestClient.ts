import EnvironmentConfigure from "../EnvironmentConfigures/EnvironmentConfigure";
import { RequestCollection } from "./RequestCollection";

export default class AutoRestClient{
    requests: RequestCollection | undefined;
    environment:EnvironmentConfigure;

    constructor(environment:EnvironmentConfigure){
        this.requests = undefined; 
        this.environment = environment;
    }
}