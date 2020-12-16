import { Request } from "./Request";

export default class RequestCollection{
    
    constructor(private requests : {[name:string]:Request}){ }

    execute(){

    }

    getResponses() : string{
        return "";
    }
}