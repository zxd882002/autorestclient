import EnvironmentConfigure from "../EnvironmentConfigures/EnvironmentConfigure";
import RequestCollection from "./RequestCollection";

export default class AutoRestClient{
    public requests?: RequestCollection;

    constructor(public environment:EnvironmentConfigure){
    }
}