import { fdir } from "fdir";
import { ICommandOptions } from "./index";
import { resolve } from "path";
import * as TJS from "typescript-json-schema";
import fs from "fs";
import picomatch from "picomatch";
import path from "path";
import {
    Project,
    InterfaceDeclaration,
    IndentationText,
    NewLineKind,
    QuoteKind,
    StructureKind,
    VariableDeclarationKind,
    CodeBlockWriter,
} from "ts-morph";

export class SchemaGenerator {
    private outputPath = path.join(this.options.rootPath, this.options.output);
    private jsonSchemaOutputFile = path.join(this.options.rootPath, this.options.output, "validation.schema.json");
    private tsSchemaDefinitionOutputFile = path.join(this.options.rootPath, this.options.output, "SchemaDefinition.ts");
    public constructor(private options: ICommandOptions) {
        this.generateOutput();
    }

    private generateOutput = async () => {
        const filesList = await this.getMatchingFiles();
        const map = await this.getJsonSchemaMap(filesList);
        this.writeSchemaMapToValidationSchema(map);
        await this.writeSchemaMapToValidationTypes(map);
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

    private getJsonSchemaMap = async (filesList: Array<string>) => {
        const schemaMap = new Map<string, TJS.Definition>();
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

    private ensureOutputPathExists = () => {
        if (!fs.existsSync(this.outputPath)) {
            fs.mkdirSync(this.outputPath, { recursive: true });
        }
    };

    private writeSchemaMapToValidationSchema = (schemaMap: Map<string, TJS.Definition>) => {
        const { output, rootPath } = this.options;
        const definitions: { [id: string]: TJS.Definition } = {};
        schemaMap.forEach((schema, key) => {
            definitions[key] = schema;
        });
        const outputBuffer: TJS.Definition = {
            $schema: this.getSchemaVersion(schemaMap),
            definitions,
        };

        this.ensureOutputPathExists();
        fs.writeFileSync(this.jsonSchemaOutputFile, JSON.stringify(outputBuffer, null, 4));
    };

    private writeSchemaMapToValidationTypes = async (schemaMap: Map<string, TJS.Definition>) => {
        const outputFolder = `${this.options.rootPath}/${this.options.output}/`;
        const project = new Project({
            manipulationSettings: {
                indentationText: IndentationText.FourSpaces,
                newLineKind: NewLineKind.LineFeed,
                quoteKind: QuoteKind.Double,
                usePrefixAndSuffixTextForRename: false,
                useTrailingCommas: true,
            },
        });

        const symbols = Array.from(schemaMap.keys()).filter((symbol) => {
            return symbol !== "ISchema" && symbol !== "Schemas";
        });

        const sourceFile = project.createSourceFile(this.tsSchemaDefinitionOutputFile);

        sourceFile.addImportDeclarations(
            symbols.map((symbol) => {
                const filePath = "./file";
                return { namespaceImport: symbol, moduleSpecifier: filePath };
            })
        );

        sourceFile.addVariableStatement({
            declarationKind: VariableDeclarationKind.Const,
            declarations: [
                {
                    name: "schemas",
                    type: "Record<keyof ISchema, string>",
                    initializer: (writer: CodeBlockWriter) => {
                        writer.writeLine(`{`);
                        symbols.forEach((symbol) => {
                            writer.writeLine(`["#/definitions/${symbol}"] : "${symbol}",`);
                        }),
                            writer.writeLine(`}`);
                    },
                },
            ],
        });

        sourceFile.addInterface({
            kind: StructureKind.Interface,
            name: "ISchema",
            isExported: true,
            properties: symbols.map((symbol) => {
                return { name: `readonly ["#/definitions/${symbol}"]`, type: symbol };
            }),
        });

        await project.save();
    };
}
