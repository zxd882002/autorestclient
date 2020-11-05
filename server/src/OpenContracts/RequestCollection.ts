import { Request } from "./Request";

export class RequestCollection{
    
    constructor(private requests : {[name:string]:Request}){ }

    execute(){

    }

    getResponses() : string{
        return "";
    }
}