export default interface ScriptExecutor {
    executeScript: (content: string) => void;
}