import { fdir } from "fdir";
import { ICommandOptions } from "./index";
import { resolve } from "path";
import * as TJS from "typescript-json-schema";
import fs from "fs";
import picomatch from "picomatch";
import path from "path";

export class SchemaGenerator {
    public constructor(private options: ICommandOptions) {
        this.generateOutput();
    }

    private generateOutput = async () => {
        const map = await this.getJsonSchemaMap();
        this.writeSchemaMapToOutput(map);
    };

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

    private getJsonSchemaMap = async () => {
        const schemaMap = new Map<string, TJS.Definition>();
        const filesList = await this.getMatchingFiles();
        const files = filesList.map((fileName) => {
            return resolve(fileName);
        });
        const settings: TJS.PartialArgs = {
            required: true,
            titles: true,
            aliasRef: true,
            ref: true,
            noExtraProps: true,
            propOrder: true,
        };

        const compilerOptions: TJS.CompilerOptions = {
            strictNullChecks: true,
        };

        const program = TJS.getProgramFromFiles(files, compilerOptions);

        const generator = TJS.buildGenerator(program, settings);
        const userDefinedSymbols = generator?.getMainFileSymbols(program) ?? [];
        userDefinedSymbols.forEach((symbol) => {
            if (schemaMap.has(symbol)) {
                throw new Error(`Duplicate symbol "${symbol}" found.`);
            }
            const schema = generator?.getSchemaForSymbol(symbol);
            if (schema) {
                schemaMap.set(symbol, schema);
            }
        });

        return schemaMap;
    };

    private getSchemaVersion = (schemaMap: Map<string, TJS.Definition>) => {
        const firstEntry = schemaMap.values().next().value;
        return firstEntry["$schema"] ?? "";
    };

    private writeSchemaMapToOutput = (schemaMap: Map<string, TJS.Definition>) => {
        const { output, rootPath } = this.options;
        const definitions: { [id: string]: TJS.Definition } = {};
        schemaMap.forEach((schema, key) => {
            definitions[key] = schema;
        });
        const outputBuffer: TJS.Definition = {
            $schema: this.getSchemaVersion(schemaMap),
            definitions,
        };

        const dir = path.join(rootPath, output);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(`${dir}/validation.schema.json`, JSON.stringify(outputBuffer));
    };
}