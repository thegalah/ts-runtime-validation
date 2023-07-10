export interface ICommandOptions {
    readonly glob: string;
    readonly rootPath: string;
    readonly output: string;
    readonly helpers: boolean;
    readonly additionalProperties: boolean;
    readonly tsconfigPath: string;
}
