import { fdir } from "fdir";
import { ICommandOptions } from "./index";
import { resolve } from "path";
import * as TJS from "typescript-json-schema";
import fs from "fs";
import picomatch from "picomatch";
import path from "path";
import {
    Project,
    IndentationText,
    NewLineKind,
    QuoteKind,
    StructureKind,
    VariableDeclarationKind,
    CodeBlockWriter,
    ProjectOptions,
    SourceFileCreateOptions,
} from "ts-morph";

const defaultProjectSettings: ProjectOptions = {
    manipulationSettings: {
        indentationText: IndentationText.FourSpaces,
        newLineKind: NewLineKind.LineFeed,
        quoteKind: QuoteKind.Double,
        usePrefixAndSuffixTextForRename: false,
        useTrailingCommas: true,
    },
};

const defaultCreateFileOptions: SourceFileCreateOptions = {
    overwrite: true,
};

const validationSchemaFileName = "validation.schema.json";
const schemaDefinitionFileName = "SchemaDefinition.ts";

export class SchemaGenerator {
    private outputPath = path.join(this.options.rootPath, this.options.output);
    private jsonSchemaOutputFile = path.join(this.options.rootPath, this.options.output, validationSchemaFileName);
    private tsSchemaDefinitionOutputFile = path.join(this.options.rootPath, this.options.output, schemaDefinitionFileName);
    private isValidSchemaOutputFile = path.join(this.options.rootPath, this.options.output, "isSchemaValid.ts");

    public constructor(private options: ICommandOptions) {
        this.generateOutput();
    }

    private generateOutput = async () => {
        const { helpers } = this.options;
        const fileList = await this.getMatchingFiles();
        console.log(`Found ${fileList.length} schema file(s)`);
        const map = await this.getJsonSchemaMap(fileList);
        console.log(`Generating ${map.size} validation schema(s)`);
        this.writeSchemaMapToValidationSchema(map);
        if (helpers === false) {
            console.log("Skipping helper file generation");
        }
        await this.writeSchemaMapToValidationTypes(map, fileList);
        this.writeValidatorFunction();
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
        return api.withPromise() as Promise<Array<string>>;
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

    private writeSchemaMapToValidationTypes = async (schemaMap: Map<string, TJS.Definition>, fileList: Array<string>) => {
        const project = new Project(defaultProjectSettings);

        const symbols = Array.from(schemaMap.keys()).filter((symbol) => {
            return symbol !== "ISchema" && symbol !== "Schemas";
        });

        const readerProject = new Project();
        readerProject.addSourceFilesAtPaths(fileList);

        const importMap = new Map<string, Array<string>>();
        fileList.forEach((file) => {
            const dir = path.dirname(file);
            const fileWithoutExtension = path.parse(file).name;
            const relativeFilePath = path.relative(this.outputPath, dir);
            const importPath = `${relativeFilePath}/${fileWithoutExtension}`;
            const source = readerProject.getSourceFile(file);
            source?.getInterfaces().forEach((interfaceDeclaration) => {
                const structure = interfaceDeclaration.getStructure();
                const namedImports = importMap.get(importPath) ?? [];
                namedImports.push(structure.name);
                importMap.set(importPath, namedImports);
            });
        });

        const sourceFile = project.createSourceFile(this.tsSchemaDefinitionOutputFile, {}, defaultCreateFileOptions);
        importMap.forEach((namedImports, importPath) => {
            sourceFile.addImportDeclaration({ namedImports, moduleSpecifier: importPath });
        });

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
            isExported: false,
            properties: symbols.map((symbol) => {
                return { name: `readonly ["#/definitions/${symbol}"]`, type: symbol };
            }),
        });

        sourceFile.addExportDeclaration({
            namedExports: ["schemas", "ISchema"],
        });

        await project.save();
    };

    private writeValidatorFunction = async () => {
        const project = new Project(defaultProjectSettings);
        const sourceFile = project.createSourceFile(this.isValidSchemaOutputFile, {}, defaultCreateFileOptions);
        sourceFile.addImportDeclaration({ namespaceImport: "schema", moduleSpecifier: `./${validationSchemaFileName}` });
        sourceFile.addImportDeclaration({ defaultImport: "Ajv", moduleSpecifier: "ajv" });
        sourceFile.addImportDeclaration({
            namedImports: ["ISchema", "schemas"],
            moduleSpecifier: `./${path.parse(schemaDefinitionFileName).name}`,
        });

        sourceFile.addVariableStatement({
            declarationKind: VariableDeclarationKind.Const,
            declarations: [
                {
                    name: "validator",
                    initializer: (writer: CodeBlockWriter) => {
                        writer.writeLine(`new Ajv({ allErrors: true });`);
                        writer.writeLine(`validator.compile(schema)`);
                    },
                },
            ],
        });

        sourceFile.addVariableStatement({
            declarationKind: VariableDeclarationKind.Const,
            declarations: [
                {
                    name: "isValidSchema",
                    initializer: (writer: CodeBlockWriter) => {
                        writer.writeLine(`<T extends keyof typeof schemas>(data: unknown, schemaKeyRef: T): data is ISchema[T] => {`);
                        writer.writeLine(`validator.validate(schemaKeyRef as string, data);`);
                        writer.writeLine(`return Boolean(validator.errors) === false;`);
                        writer.writeLine(`}`);
                    },
                },
            ],
        });

        sourceFile.addExportDeclaration({
            namedExports: ["validator", "isValidSchema"],
        });
        await project.save();
    };
}
