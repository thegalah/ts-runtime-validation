import { fdir } from "fdir";
import { ICommandOptions } from "./ICommandOptions";
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
import * as tsj from "ts-json-schema-generator";
import { Config, Schema } from "ts-json-schema-generator";
import assert from "assert";
import { writeLine } from "./writeLine";
import { getPosixPath } from "./getPosixPath";

const defaultTsMorphProjectSettings: ProjectOptions = {
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
const validationInterfacesFile = "ValidationType.ts";

export class SchemaGenerator {
    private outputPath = path.join(this.options.rootPath, this.options.output);
    private jsonSchemaOutputFile = path.join(this.options.rootPath, this.options.output, validationSchemaFileName);
    private tsSchemaDefinitionOutputFile = path.join(this.options.rootPath, this.options.output, schemaDefinitionFileName);
    private validationTypesOutputFile = path.join(this.options.rootPath, this.options.output, validationInterfacesFile);
    private isValidSchemaOutputFile = path.join(this.options.rootPath, this.options.output, "isValidSchema.ts");

    public constructor(private options: ICommandOptions) {}

    public Generate = async () => {
        const { helpers, glob } = this.options;
        const fileList = await this.getMatchingFiles();

        console.log(`Found ${fileList.length} schema file(s)`);
        if (fileList.length === 0) {
            writeLine(`Aborting - no files found with glob: ${glob}`);
            return;
        }
        const fileSchemas = await this.getJsonSchemasForFiles(fileList);

        if (fileSchemas.size === 0) {
            writeLine(`Aborting - no types found: ${glob}`);
            return;
        }
        this.writeSchemaMapToValidationSchema(fileSchemas);
        if (helpers === false) {
            writeLine("Skipping helper file generation");
            return;
        }
        await this.writeSchemaMapToValidationTypes(fileSchemas);
        this.writeValidatorFunction();
        writeLine("Writing validation types file");
        this.writeValidationTypes(fileSchemas);
    };

    private getMatchingFiles = async () => {
        const { glob, rootPath } = this.options;
        const api = new fdir({
            includeBasePath: true,
            includeDirs: false,
            filters: [
                (path) => {
                    return picomatch.isMatch(path, glob, { contains: true });
                },
            ],
        }).crawl(rootPath);
        return api.withPromise();
    };

    private getJsonSchemasForFiles = async (filesList: Array<string>) => {
        const { additionalProperties, tsconfigPath } = this.options;
        const schemaMap = new Map<string, Schema>();
        const tsconfig = tsconfigPath.length > 0 ? tsconfigPath : undefined;
        filesList.forEach((file, index) => {
            writeLine(`\rProcessing file ${index + 1} of ${filesList.length}: ${file}`);
            const config: Config = {
                path: file,
                type: "*",
                additionalProperties,
                encodeRefs: false,
                sortProps: true,
                ...(tsconfig !== null ? { tsconfig } : {}),
            };

            const schemaGenerator = tsj.createGenerator(config);
            const fileSchemas = schemaGenerator.createSchema(config.type);
            schemaMap.set(file, fileSchemas);
        });
        return schemaMap;
    };

    private getSchemaVersion = (schemaMap: Map<string, Schema>) => {
        const firstEntry = schemaMap.values().next().value;
        return firstEntry["$schema"] ?? "";
    };

    private ensureOutputPathExists = () => {
        if (!fs.existsSync(this.outputPath)) {
            fs.mkdirSync(this.outputPath, { recursive: true });
        }
    };

    private writeSchemaMapToValidationSchema = (schemaMap: Map<string, Schema>) => {
        const definitions: { [id: string]: Schema } = {};
        schemaMap.forEach((fileSchema) => {
            const defs = fileSchema.definitions ?? {};

            Object.keys(defs).forEach((key) => {
                if (definitions[key] !== undefined) {
                    try {
                        assert.deepEqual(definitions[key], defs[key]);
                    } catch (e) {
                        console.error(
                            `Duplicate symbol: ${key} found with varying definitions.\nDefinition 1:\n${JSON.stringify(
                                definitions[key],
                                null,
                                4
                            )}\nDefinition 2:\n${JSON.stringify(defs[key], null, 4)}`
                        );
                        throw e;
                    }
                }
                const schema = defs[key] as Schema;
                definitions[key] = schema;
            });
        });
        const outputBuffer: Schema = {
            $schema: this.getSchemaVersion(schemaMap),
            definitions,
        };

        this.ensureOutputPathExists();
        fs.writeFileSync(this.jsonSchemaOutputFile, JSON.stringify(outputBuffer, null, 4));
    };

    private writeSchemaMapToValidationTypes = async (schemaMap: Map<string, Schema>) => {
        const project = new Project(defaultTsMorphProjectSettings);
        const readerProject = new Project(defaultTsMorphProjectSettings);

        const symbols: Array<string> = [];

        const importMap = new Map<string, Array<string>>();
        schemaMap.forEach((schema, filePath) => {
            const dir = path.dirname(filePath);
            const fileWithoutExtension = path.parse(filePath).name;
            const relativeFilePath = path.relative(this.outputPath, dir);
            const relativeImportPath = `${relativeFilePath}/${fileWithoutExtension}`;
            const defs = schema.definitions ?? {};

            const readerSourceFile = readerProject.addSourceFileAtPath(filePath);

            Object.keys(defs).forEach((symbol) => {
                const typeAlias = readerSourceFile.getTypeAlias(symbol);
                const typeInterface = readerSourceFile.getInterface(symbol);
                const hasTypeOrInterface = (typeAlias ?? typeInterface) !== undefined;
                if (hasTypeOrInterface) {
                    const namedImports = importMap.get(relativeImportPath) ?? [];
                    namedImports.push(symbol);
                    importMap.set(relativeImportPath, namedImports);
                    symbols.push(symbol);
                }
            });
        });

        const sourceFile = project.createSourceFile(this.tsSchemaDefinitionOutputFile, {}, defaultCreateFileOptions);

        importMap.forEach((namedImports, importPath) => {
            sourceFile.addImportDeclaration({ namedImports, moduleSpecifier: getPosixPath(importPath) });
        });

        sourceFile.addVariableStatement({
            isExported: true,
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

    private writeValidatorFunction = async () => {
        const project = new Project(defaultTsMorphProjectSettings);
        const sourceFile = project.createSourceFile(this.isValidSchemaOutputFile, {}, defaultCreateFileOptions);
        sourceFile.addImportDeclaration({ namespaceImport: "schema", moduleSpecifier: `./${validationSchemaFileName}` });
        sourceFile.addImportDeclaration({ defaultImport: "Ajv", moduleSpecifier: "ajv" });
        sourceFile.addImportDeclaration({
            namedImports: ["ISchema", "schemas"],
            moduleSpecifier: `./${path.parse(schemaDefinitionFileName).name}`,
        });
        sourceFile.addVariableStatement({
            isExported: true,
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
            isExported: true,
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
        await project.save();
    };

    private writeValidationTypes = async (schemaMap: Map<string, Schema>) => {
        const project = new Project(defaultTsMorphProjectSettings);
        const readerProject = new Project(defaultTsMorphProjectSettings);

        const symbols: Array<string> = [];

        const importMap = new Map<string, Array<string>>();
        schemaMap.forEach((schema, filePath) => {
            const dir = path.dirname(filePath);
            const fileWithoutExtension = path.parse(filePath).name;
            const relativeFilePath = path.relative(this.outputPath, dir);
            const importPath = `${relativeFilePath}/${fileWithoutExtension}`;
            const defs = schema.definitions ?? {};

            const readerSourceFile = readerProject.addSourceFileAtPath(filePath);

            Object.keys(defs).forEach((symbol) => {
                const typeAlias = readerSourceFile.getTypeAlias(symbol);
                const typeInterface = readerSourceFile.getInterface(symbol);
                const hasTypeOrInterface = (typeAlias ?? typeInterface) !== undefined;
                if (hasTypeOrInterface) {
                    const namedImports = importMap.get(importPath) ?? [];
                    namedImports.push(symbol);
                    importMap.set(importPath, namedImports);
                    symbols.push(symbol);
                }
            });
        });

        const sourceFile = project.createSourceFile(this.validationTypesOutputFile, {}, defaultCreateFileOptions);

        importMap.forEach((namedImports, importPath) => {
            const declaration = sourceFile.addImportDeclaration({ moduleSpecifier: importPath });
            namedImports.forEach((namedImport) => {
                const name = namedImport.valueOf();
                const alias = `_${name}`;
                declaration.addNamedImport({ name, alias });
            });
        });
        const namespace = sourceFile.addModule({
            name: "ValidationType",
            isExported: true,
        });

        importMap.forEach((namedImports) => {
            namedImports.forEach((namedImport) => {
                const name = namedImport.valueOf();
                const alias = `_${name}`;
                namespace.addTypeAlias({ name, type: alias, isExported: true });
            });
        });

        await project.save();
    };
}
