import { fdir } from "fdir";
import { ICommandOptions } from "./index";
import { resolve } from "path";
import * as TJS from "typescript-json-schema";
import picomatch from "picomatch";

export class SchemaGenerator {
    public constructor(private options: ICommandOptions) {
        this.generateJsonSchema();
    }

    private getMatchingFiles = async () => {
        const { glob, rootPath } = this.options;
        const api = new fdir().crawlWithOptions(rootPath, {
            includeBasePath: true,
            includeDirs: false,
            filters: [
                (path) => {
                    return picomatch.isMatch(path, glob, { contains: true });
                },
            ],
        });
        return (await api.withPromise()) as Array<string>;
    };

    private generateJsonSchema = async () => {
        const filesList = await this.getMatchingFiles();
        const files = filesList.map((fileName) => {
            return resolve(fileName);
        });
        const settings: TJS.PartialArgs = {
            required: true,
        };

        const compilerOptions: TJS.CompilerOptions = {
            strictNullChecks: true,
        };

        const program = TJS.getProgramFromFiles(files, compilerOptions);

        const generator = TJS.buildGenerator(program, settings);
        const userDefinedSymbols = generator.getMainFileSymbols(program);
        userDefinedSymbols.forEach((symbol) => {
            const schema = generator.getSchemaForSymbol(symbol);
            console.log(schema);
        });
    };
}
