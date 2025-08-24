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
import { Schema } from "ts-json-schema-generator";
import path from "path";
import { getPosixPath } from "../getPosixPath";
import { CodeGenerationError } from "../errors";

export interface CodeGeneratorOptions {
    outputPath: string;
    minify?: boolean;
    treeShaking?: boolean;
    lazyLoad?: boolean;
}

interface TypeInfo {
    symbol: string;
    importPath: string;
    isInterface: boolean;
}

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

export class CodeGenerator {
    private project: Project;
    
    constructor(private options: CodeGeneratorOptions) {
        this.project = new Project(defaultTsMorphProjectSettings);
    }

    public async generateSchemaDefinition(
        schemaMap: Map<string, Schema>,
        outputFile: string
    ): Promise<void> {
        try {
            const typeInfos = this.extractTypeInfo(schemaMap);
            await this.writeSchemaDefinitionFile(typeInfos, outputFile);
        } catch (error) {
            throw new CodeGenerationError(
                `Failed to generate schema definition: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    public async generateValidatorFunction(outputFile: string): Promise<void> {
        try {
            const sourceFile = this.project.createSourceFile(outputFile, {}, defaultCreateFileOptions);
            
            if (this.options.lazyLoad) {
                this.generateLazyValidator(sourceFile);
            } else {
                this.generateStandardValidator(sourceFile);
            }
            
            await this.project.save();
        } catch (error) {
            throw new CodeGenerationError(
                `Failed to generate validator function: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    public async generateValidationTypes(
        schemaMap: Map<string, Schema>,
        outputFile: string
    ): Promise<void> {
        try {
            const typeInfos = this.extractTypeInfo(schemaMap);
            await this.writeValidationTypesFile(typeInfos, outputFile);
        } catch (error) {
            throw new CodeGenerationError(
                `Failed to generate validation types: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    private extractTypeInfo(schemaMap: Map<string, Schema>): TypeInfo[] {
        const readerProject = new Project(defaultTsMorphProjectSettings);
        const typeInfos: TypeInfo[] = [];
        
        schemaMap.forEach((schema, filePath) => {
            const dir = path.dirname(filePath);
            const fileWithoutExtension = path.parse(filePath).name;
            const relativeFilePath = path.relative(this.options.outputPath, dir);
            const relativeImportPath = `${relativeFilePath}/${fileWithoutExtension}`;
            const defs = schema.definitions ?? {};
            
            const readerSourceFile = readerProject.addSourceFileAtPath(filePath);
            
            Object.keys(defs).forEach((symbol) => {
                const typeAlias = readerSourceFile.getTypeAlias(symbol);
                const typeInterface = readerSourceFile.getInterface(symbol);
                
                if (typeAlias || typeInterface) {
                    typeInfos.push({
                        symbol,
                        importPath: getPosixPath(relativeImportPath),
                        isInterface: !!typeInterface
                    });
                }
            });
        });
        
        return typeInfos;
    }

    private async writeSchemaDefinitionFile(
        typeInfos: TypeInfo[],
        outputFile: string
    ): Promise<void> {
        const sourceFile = this.project.createSourceFile(outputFile, {}, defaultCreateFileOptions);
        
        if (this.options.treeShaking) {
            this.generateTreeShakingImports(sourceFile, typeInfos);
        } else {
            this.generateStandardImports(sourceFile, typeInfos);
        }
        
        sourceFile.addVariableStatement({
            isExported: true,
            declarationKind: VariableDeclarationKind.Const,
            declarations: [
                {
                    name: "schemas",
                    type: "Record<keyof ISchema, string>",
                    initializer: (writer: CodeBlockWriter) => {
                        writer.writeLine(`{`);
                        typeInfos.forEach(({ symbol }) => {
                            writer.writeLine(`["#/definitions/${symbol}"] : "${symbol}",`);
                        });
                        writer.writeLine(`}`);
                    },
                },
            ],
        });
        
        sourceFile.addInterface({
            kind: StructureKind.Interface,
            name: "ISchema",
            isExported: true,
            properties: typeInfos.map(({ symbol }) => ({
                name: `readonly ["#/definitions/${symbol}"]`,
                type: symbol
            })),
        });
        
        await this.project.save();
    }

    private generateTreeShakingImports(sourceFile: any, typeInfos: TypeInfo[]): void {
        const importMap = new Map<string, string[]>();
        
        typeInfos.forEach(({ symbol, importPath }) => {
            const existing = importMap.get(importPath) || [];
            existing.push(symbol);
            importMap.set(importPath, existing);
        });
        
        importMap.forEach((symbols, importPath) => {
            sourceFile.addImportDeclaration({
                namedImports: symbols,
                moduleSpecifier: importPath
            });
        });
    }

    private generateStandardImports(sourceFile: any, typeInfos: TypeInfo[]): void {
        const importMap = new Map<string, string[]>();
        
        typeInfos.forEach(({ symbol, importPath }) => {
            const existing = importMap.get(importPath) || [];
            existing.push(symbol);
            importMap.set(importPath, existing);
        });
        
        importMap.forEach((symbols, importPath) => {
            sourceFile.addImportDeclaration({
                namedImports: symbols,
                moduleSpecifier: importPath
            });
        });
    }

    private generateLazyValidator(sourceFile: any): void {
        sourceFile.addImportDeclaration({
            namespaceImport: "schema",
            moduleSpecifier: "./validation.schema.json"
        });
        sourceFile.addImportDeclaration({
            namedImports: ["ISchema", "schemas"],
            moduleSpecifier: "./SchemaDefinition"
        });
        
        sourceFile.addVariableStatement({
            isExported: true,
            declarationKind: VariableDeclarationKind.Let,
            declarations: [
                {
                    name: "validator",
                    type: "any",
                    initializer: "null"
                }
            ]
        });
        
        sourceFile.addFunction({
            name: "getValidator",
            isExported: false,
            statements: (writer: CodeBlockWriter) => {
                writer.writeLine(`if (!validator) {`);
                writer.writeLine(`    const Ajv = require("ajv");`);
                writer.writeLine(`    validator = new Ajv({ allErrors: true });`);
                writer.writeLine(`    validator.compile(schema);`);
                writer.writeLine(`}`);
                writer.writeLine(`return validator;`);
            }
        });
        
        sourceFile.addVariableStatement({
            declarationKind: VariableDeclarationKind.Const,
            isExported: true,
            declarations: [
                {
                    name: "isValidSchema",
                    initializer: (writer: CodeBlockWriter) => {
                        writer.writeLine(`<T extends keyof typeof schemas>(data: unknown, schemaKeyRef: T): data is ISchema[T] => {`);
                        writer.writeLine(`const v = getValidator();`);
                        writer.writeLine(`v.validate(schemaKeyRef as string, data);`);
                        writer.writeLine(`return Boolean(v.errors) === false;`);
                        writer.writeLine(`}`);
                    },
                },
            ],
        });
    }

    private generateStandardValidator(sourceFile: any): void {
        sourceFile.addImportDeclaration({
            namespaceImport: "schema",
            moduleSpecifier: "./validation.schema.json"
        });
        sourceFile.addImportDeclaration({
            defaultImport: "Ajv",
            moduleSpecifier: "ajv"
        });
        sourceFile.addImportDeclaration({
            namedImports: ["ISchema", "schemas"],
            moduleSpecifier: "./SchemaDefinition"
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
    }

    private async writeValidationTypesFile(
        typeInfos: TypeInfo[],
        outputFile: string
    ): Promise<void> {
        const sourceFile = this.project.createSourceFile(outputFile, {}, defaultCreateFileOptions);
        
        const importMap = new Map<string, string[]>();
        typeInfos.forEach(({ symbol, importPath }) => {
            const existing = importMap.get(importPath) || [];
            existing.push(symbol);
            importMap.set(importPath, existing);
        });
        
        importMap.forEach((symbols, importPath) => {
            const declaration = sourceFile.addImportDeclaration({
                moduleSpecifier: importPath
            });
            symbols.forEach((symbol) => {
                declaration.addNamedImport({
                    name: symbol,
                    alias: `_${symbol}`
                });
            });
        });
        
        if (this.options.treeShaking) {
            typeInfos.forEach(({ symbol }) => {
                sourceFile.addTypeAlias({
                    name: symbol,
                    type: `_${symbol}`,
                    isExported: true
                });
            });
        } else {
            const namespace = sourceFile.addModule({
                name: "ValidationType",
                isExported: true,
            });
            
            typeInfos.forEach(({ symbol }) => {
                namespace.addTypeAlias({
                    name: symbol,
                    type: `_${symbol}`,
                    isExported: true
                });
            });
        }
        
        await this.project.save();
    }
}