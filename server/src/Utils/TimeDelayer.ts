export default class TimeDelayer {
    static delayAsync(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static delay(ms: number) {
        setTimeout(() => { /*Your Code*/ }, ms);
    }
}

