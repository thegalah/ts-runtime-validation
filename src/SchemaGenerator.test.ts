import fs from "fs";
import path from "path";
import { ICommandOptions } from "./ICommandOptions";
import { SchemaGenerator } from "./SchemaGenerator";

const cleanupTestOutput = () => {
    const outputDir = path.posix.resolve(__dirname, "./test/output");
    const doesDirectoryExist = fs.existsSync(outputDir);
    if (doesDirectoryExist) {
        fs.rmSync(outputDir, { recursive: true });
    }
};

const getGeneratorConfig = (scenarioPath: string) => {
    const options: ICommandOptions = {
        glob: "*.jsonschema.ts",
        rootPath: path.resolve(__dirname, `./test/${scenarioPath}`),
        output: `../output/${scenarioPath}`,
        helpers: true,
        additionalProperties: false,
        tsconfigPath: "",
        verbose: false,
        progress: false,
        minify: false,
        cache: false,
        parallel: false,
        treeShaking: false,
        lazyLoad: false
    };
    return options;
};

const getOutputSchemaPath = (scenarioPath: string) => {
    return path.resolve(__dirname, `./test/output/${scenarioPath}`, "validation.schema.json");
};

beforeAll(cleanupTestOutput);
afterAll(cleanupTestOutput);

describe("SchemaGenerator", () => {
    test("it should generate the correct schema for a basic interface", async () => {
        const scenarioPath = "basic-scenario";
        const options = getGeneratorConfig(scenarioPath);
        const generator = new SchemaGenerator(options);
        await generator.Generate();
        const rawFile = fs.readFileSync(getOutputSchemaPath(scenarioPath)).toString();
        const result = JSON.parse(rawFile);
        const expected = {
            $schema: "http://json-schema.org/draft-07/schema#",
            definitions: {
                IBasicTypes: {
                    type: "object",
                    properties: {
                        propertyA: {
                            type: "string",
                        },
                        propertyB: {
                            type: "string",
                        },
                    },
                    required: ["propertyA", "propertyB"],
                    additionalProperties: false,
                },
            },
        };
        expect(result).toStrictEqual(expected);
    });

    test("it should throw an error when there are different implementations of an interface", async () => {
        const options = getGeneratorConfig("duplicate-symbols-different-implementation");
        const generator = new SchemaGenerator(options);
        await expect(generator.Generate()).rejects.toThrow();
    });

    test("it should not an error when there are identical definitions interface", async () => {
        const scenarioPath = "duplicate-symbols-identitcal-implementation";
        const options = getGeneratorConfig(scenarioPath);
        const generator = new SchemaGenerator(options);
        await generator.Generate();
        const rawFile = fs.readFileSync(getOutputSchemaPath(scenarioPath)).toString();
        const result = JSON.parse(rawFile);
        const expected = {
            $schema: "http://json-schema.org/draft-07/schema#",
            definitions: {
                IBasicTypesA: {
                    type: "object",
                    properties: {
                        propertyA: {
                            $ref: "#/definitions/IBaseType",
                        },
                        propertyB: {
                            $ref: "#/definitions/IBaseType",
                        },
                    },
                    required: ["propertyA", "propertyB"],
                    additionalProperties: false,
                },
                IBaseType: {
                    type: "object",
                    properties: {
                        someProperty: {
                            type: "string",
                        },
                    },
                    required: ["someProperty"],
                    additionalProperties: false,
                },
                IBasicTypesB: {
                    type: "object",
                    properties: {
                        propertyA: {
                            $ref: "#/definitions/IBaseType",
                        },
                        propertyB: {
                            $ref: "#/definitions/IBaseType",
                        },
                    },
                    required: ["propertyA", "propertyB"],
                    additionalProperties: false,
                },
            },
        };
        expect(result).toStrictEqual(expected);
    });

    test("it should sort definitions alphabetically in the generated schema", async () => {
        // Create test directory and files
        const testDir = path.resolve(__dirname, "./test/alphabetical-sorting");
        
        // Ensure test directory exists
        fs.mkdirSync(testDir, { recursive: true });
        
        // Create test file with unsorted type definitions
        const testFilePath = path.join(testDir, "types.jsonschema.ts");
        fs.writeFileSync(testFilePath, `
            export interface ZebraType {
                id: string;
            }
            
            export interface AppleType {
                name: string;
            }
            
            export interface MiddleType {
                value: number;
            }
            
            export interface BananaType {
                flag: boolean;
            }
        `);
        
        try {
            const options = getGeneratorConfig("alphabetical-sorting");
            const generator = new SchemaGenerator(options);
            await generator.Generate();
            
            const rawFile = fs.readFileSync(getOutputSchemaPath("alphabetical-sorting")).toString();
            const result = JSON.parse(rawFile);
            
            // Check that definitions are sorted alphabetically
            const definitionKeys = Object.keys(result.definitions);
            const sortedKeys = [...definitionKeys].sort();
            
            expect(definitionKeys).toEqual(sortedKeys);
            expect(definitionKeys).toEqual(['AppleType', 'BananaType', 'MiddleType', 'ZebraType']);
        } finally {
            // Clean up test directory
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true });
            }
        }
    });

    test("it should sort properties alphabetically in generated TypeScript helpers", async () => {
        // Create test directory and files
        const testDir = path.resolve(__dirname, "./test/alphabetical-helpers");
        const outputDir = path.resolve(__dirname, "./test/output/alphabetical-helpers");
        
        // Ensure test directory exists
        fs.mkdirSync(testDir, { recursive: true });
        
        // Create test file with unsorted type definitions
        const testFilePath = path.join(testDir, "types.jsonschema.ts");
        fs.writeFileSync(testFilePath, `
            export type ZebraType = string;
            export type AppleType = number;
            export type MiddleType = boolean;
            export type BananaType = object;
        `);
        
        try {
            const options = {
                ...getGeneratorConfig("alphabetical-helpers"),
                helpers: true
            };
            const generator = new SchemaGenerator(options);
            await generator.Generate();
            
            // Check SchemaDefinition.ts for sorted imports and properties
            const schemaDefPath = path.resolve(outputDir, "SchemaDefinition.ts");
            if (fs.existsSync(schemaDefPath)) {
                const schemaDefContent = fs.readFileSync(schemaDefPath, 'utf-8');
                
                // Extract type names from the schemas object (looking only at the schemas constant)
                const schemasMatch = schemaDefContent.match(/export const schemas[^{]*{([\s\S]*?)}/);
                let schemaKeys: string[] = [];
                if (schemasMatch) {
                    const schemaLines = schemasMatch[1].split('\n').filter(line => line.includes('#/definitions/'));
                    schemaKeys = schemaLines.map(line => {
                        const match = line.match(/\["#\/definitions\/([^"]+)"\]/);
                        return match ? match[1] : null;
                    }).filter(Boolean) as string[];
                }
                
                const sortedSchemaKeys = [...schemaKeys].sort();
                
                expect(schemaKeys).toEqual(sortedSchemaKeys);
                expect(schemaKeys).toEqual(['AppleType', 'BananaType', 'MiddleType', 'ZebraType']);
                
                // Check that imports are sorted
                const importMatch = schemaDefContent.match(/import\s+{\s*([^}]+)\s*}/);
                if (importMatch) {
                    const imports = importMatch[1].split(',').map(s => s.trim());
                    const sortedImports = [...imports].sort();
                    expect(imports).toEqual(sortedImports);
                }
            }
        } finally {
            // Clean up test directory
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true });
            }
        }
    });
});
