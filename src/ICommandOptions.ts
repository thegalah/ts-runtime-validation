export interface ICommandOptions {
    readonly glob: string;
    readonly rootPath: string;
    readonly output: string;
    readonly helpers: boolean;
    readonly additionalProperties: boolean;
    readonly tsconfigPath: string;
    readonly verbose?: boolean;
    readonly progress?: boolean;
    readonly minify?: boolean;
    readonly cache?: boolean;
    readonly parallel?: boolean;
    readonly treeShaking?: boolean;
    readonly lazyLoad?: boolean;
}
