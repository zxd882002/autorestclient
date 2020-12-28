export default class EnvironmentConfigureItem {
    constructor(
        public configureName: string,
        public configureValue: (parameter?: string) => string,
        public congigureFileName?: string
    ) { }
}