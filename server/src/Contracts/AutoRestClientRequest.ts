export default class AutoRestClientRequest {
	public name: string;
	public method: "GET" | "POST" | "PUT" | "PATCH" | "HEAD" | "DELETE" | "OPTIONS" | "TRACE" | "get" | "post" | "put" | "patch" | "head" | "delete" | "options" | "trace" | undefined;
	public url: string;
	public headers: Record<string, string | string[] | undefined>;
	public body: any;
	public beforeScript: string;
	public afterScript: string;
	public startLine: number;
	public endLine: number;
	public innerRequests?: AutoRestClientRequest[];

	public constructor(startLine: number
	) {
		this.name = "";
		this.method = undefined;
		this.url = "";
		this.headers = {};
		this.body = "";
		this.beforeScript = "";
		this.afterScript = "";
		this.startLine = startLine;
		this.endLine = -1;
		this.innerRequests = undefined;
	}
}