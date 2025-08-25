import fs from "fs";
import path from "path";
import { SchemaProcessor } from "./SchemaProcessor";
import { FileInfo } from "./FileDiscovery";
import { DuplicateSymbolError } from "../errors";

const testDir = path.resolve(__dirname, "../test-tmp/schema-processor");

const createTestFile = async (filePath: string, content: string) => {
    const fullPath = path.resolve(testDir, filePath);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, content);
    return fullPath;
};

const cleanup = async () => {
    if (fs.existsSync(testDir)) {
        await fs.promises.rm(testDir, { recursive: true, force: true });
    }
};

beforeEach(cleanup);
afterAll(cleanup);

describe("SchemaProcessor", () => {
    describe("processFiles", () => {
        it("should process valid TypeScript files", async () => {
            const filePath = await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                    email?: string;
                }
            `);

            const processor = new SchemaProcessor({
                additionalProperties: false,
                parallel: false,
                verbose: false
            });

            const files: FileInfo[] = [{ path: filePath }];
            const schemaMap = await processor.processFiles(files);

            expect(schemaMap.size).toBe(1);
            expect(schemaMap.has(filePath)).toBe(true);

            const schema = schemaMap.get(filePath)!;
            expect(schema.definitions).toBeDefined();
            expect(schema.definitions!.IUser).toBeDefined();
            expect(schema.definitions!.IUser).toMatchObject({
                type: "object",
                properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    email: { type: "string" }
                },
                required: ["id", "name"],
                additionalProperties: false
            });
        });

        it("should handle parallel processing", async () => {
            const file1 = await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            const file2 = await createTestFile("product.jsonschema.ts", `
                export interface IProduct {
                    id: string;
                    title: string;
                    price: number;
                }
            `);

            const processor = new SchemaProcessor({
                additionalProperties: false,
                parallel: true,
                verbose: false
            });

            const files: FileInfo[] = [
                { path: file1 },
                { path: file2 }
            ];

            const schemaMap = await processor.processFiles(files);

            expect(schemaMap.size).toBe(2);
            expect(schemaMap.has(file1)).toBe(true);
            expect(schemaMap.has(file2)).toBe(true);
        });

        it("should handle sequential processing", async () => {
            const file1 = await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            const processor = new SchemaProcessor({
                additionalProperties: false,
                parallel: false,
                verbose: false
            });

            const files: FileInfo[] = [{ path: file1 }];
            const schemaMap = await processor.processFiles(files);

            expect(schemaMap.size).toBe(1);
        });

        it("should handle files with syntax errors gracefully", async () => {
            const validFile = await createTestFile("valid.jsonschema.ts", `
                export interface IValid {
                    id: string;
                }
            `);

            const invalidFile = await createTestFile("invalid.jsonschema.ts", `
                export interface IInvalid {
                    id: string
                    // missing semicolon and other syntax errors
                    name string;
                }
            `);

            const processor = new SchemaProcessor({
                additionalProperties: false,
                parallel: false,
                verbose: false
            });

            const files: FileInfo[] = [
                { path: validFile },
                { path: invalidFile }
            ];

            // Should not throw but should process valid files
            const schemaMap = await processor.processFiles(files);
            
            // At least valid file should be processed
            expect(schemaMap.size).toBeGreaterThan(0);
            expect(schemaMap.has(validFile)).toBe(true);
        });

        it("should respect additionalProperties setting", async () => {
            const filePath = await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            const processorStrict = new SchemaProcessor({
                additionalProperties: false,
                parallel: false
            });

            const processorLoose = new SchemaProcessor({
                additionalProperties: true,
                parallel: false
            });

            const files: FileInfo[] = [{ path: filePath }];
            
            const strictSchema = await processorStrict.processFiles(files);
            const looseSchema = await processorLoose.processFiles(files);

            const strictUser = strictSchema.get(filePath)!.definitions!.IUser as any;
            const looseUser = looseSchema.get(filePath)!.definitions!.IUser as any;
            
            expect(strictUser.additionalProperties).toBe(false);
            // Note: ts-json-schema-generator may not set additionalProperties: true explicitly
            expect(looseUser.additionalProperties === true || looseUser.additionalProperties === undefined).toBe(true);
        });
    });

    describe("validateSchemaCompatibility", () => {
        it("should pass with identical schemas", async () => {
            const file1 = await createTestFile("user1.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            const file2 = await createTestFile("user2.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            const processor = new SchemaProcessor({
                additionalProperties: false,
                parallel: false
            });

            const files: FileInfo[] = [
                { path: file1 },
                { path: file2 }
            ];

            const schemaMap = await processor.processFiles(files);
            
            expect(() => {
                processor.validateSchemaCompatibility(schemaMap);
            }).not.toThrow();
        });

        it("should throw DuplicateSymbolError for conflicting schemas", async () => {
            const file1 = await createTestFile("user1.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            const file2 = await createTestFile("user2.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    email: string;
                }
            `);

            const processor = new SchemaProcessor({
                additionalProperties: false,
                parallel: false
            });

            const files: FileInfo[] = [
                { path: file1 },
                { path: file2 }
            ];

            const schemaMap = await processor.processFiles(files);
            
            expect(() => {
                processor.validateSchemaCompatibility(schemaMap);
            }).toThrow(DuplicateSymbolError);
        });

        it("should allow different symbols with same name in different contexts", async () => {
            const file1 = await createTestFile("api/user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
                
                export interface IProduct {
                    id: string;
                    title: string;
                }
            `);

            const processor = new SchemaProcessor({
                additionalProperties: false,
                parallel: false
            });

            const files: FileInfo[] = [{ path: file1 }];
            const schemaMap = await processor.processFiles(files);
            
            expect(() => {
                processor.validateSchemaCompatibility(schemaMap);
            }).not.toThrow();
        });
    });

    describe("mergeSchemas", () => {
        it("should merge multiple schemas correctly", async () => {
            const file1 = await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            const file2 = await createTestFile("product.jsonschema.ts", `
                export interface IProduct {
                    id: string;
                    title: string;
                    price: number;
                }
            `);

            const processor = new SchemaProcessor({
                additionalProperties: false,
                parallel: false
            });

            const files: FileInfo[] = [
                { path: file1 },
                { path: file2 }
            ];

            const schemaMap = await processor.processFiles(files);
            const mergedSchema = processor.mergeSchemas(schemaMap);

            expect(mergedSchema.$schema).toBe("http://json-schema.org/draft-07/schema#");
            expect(mergedSchema.definitions).toBeDefined();
            expect(mergedSchema.definitions!.IUser).toBeDefined();
            expect(mergedSchema.definitions!.IProduct).toBeDefined();
        });

        it("should preserve schema version from first file", async () => {
            const file1 = await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            const processor = new SchemaProcessor({
                additionalProperties: false,
                parallel: false
            });

            const files: FileInfo[] = [{ path: file1 }];
            const schemaMap = await processor.processFiles(files);
            const mergedSchema = processor.mergeSchemas(schemaMap);

            expect(mergedSchema.$schema).toMatch(/json-schema\.org/);
        });

        it("should handle empty schema map", () => {
            const processor = new SchemaProcessor({
                additionalProperties: false,
                parallel: false
            });

            const schemaMap = new Map();
            const mergedSchema = processor.mergeSchemas(schemaMap);

            expect(mergedSchema.$schema).toBe("http://json-schema.org/draft-07/schema#");
            expect(mergedSchema.definitions).toEqual({});
        });

        it("should sort definitions alphabetically in merged schema", async () => {
            const file1 = await createTestFile("types1.jsonschema.ts", `
                export interface ZebraType {
                    id: string;
                }
                export interface AppleType {
                    name: string;
                }
            `);

            const file2 = await createTestFile("types2.jsonschema.ts", `
                export interface MiddleType {
                    value: number;
                }
                export interface BananaType {
                    flag: boolean;
                }
            `);

            const processor = new SchemaProcessor({
                additionalProperties: false,
                parallel: false
            });

            const files: FileInfo[] = [
                { path: file1 },
                { path: file2 }
            ];

            const schemaMap = await processor.processFiles(files);
            const mergedSchema = processor.mergeSchemas(schemaMap);

            const definitionKeys = Object.keys(mergedSchema.definitions || {});
            const sortedKeys = [...definitionKeys].sort();

            expect(definitionKeys).toEqual(sortedKeys);
            expect(definitionKeys).toEqual(['AppleType', 'BananaType', 'MiddleType', 'ZebraType']);
        });

        it("should maintain alphabetical order for definitions with numbers and special characters", async () => {
            const file1 = await createTestFile("special.jsonschema.ts", `
                export interface Type1 {
                    id: string;
                }
                export interface TypeA {
                    name: string;
                }
                export interface Type10 {
                    value: number;
                }
                export interface Type2 {
                    flag: boolean;
                }
            `);

            const processor = new SchemaProcessor({
                additionalProperties: false,
                parallel: false
            });

            const files: FileInfo[] = [{ path: file1 }];
            const schemaMap = await processor.processFiles(files);
            const mergedSchema = processor.mergeSchemas(schemaMap);

            const definitionKeys = Object.keys(mergedSchema.definitions || {});
            const sortedKeys = [...definitionKeys].sort();

            expect(definitionKeys).toEqual(sortedKeys);
            // Natural alphabetical order: numbers before letters
            expect(definitionKeys).toEqual(['Type1', 'Type10', 'Type2', 'TypeA']);
        });
    });

    describe("error handling", () => {
        it("should handle missing files gracefully", async () => {
            const processor = new SchemaProcessor({
                additionalProperties: false,
                parallel: false,
                verbose: false
            });

            const files: FileInfo[] = [
                { path: "/nonexistent/file.ts" }
            ];

            // Should not throw but return empty map
            const schemaMap = await processor.processFiles(files);
            expect(schemaMap.size).toBe(0);
        });

        it("should provide verbose error information", async () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

            const processor = new SchemaProcessor({
                additionalProperties: false,
                parallel: false,
                verbose: true
            });

            const files: FileInfo[] = [
                { path: "/nonexistent/file.ts" }
            ];

            await processor.processFiles(files);
            
            expect(consoleWarnSpy).toHaveBeenCalled();
            consoleWarnSpy.mockRestore();
        });
    });

    describe("TypeScript features", () => {
        it("should handle union types", async () => {
            const filePath = await createTestFile("types.jsonschema.ts", `
                export type Status = "active" | "inactive" | "pending";
                
                export interface IUser {
                    id: string;
                    status: Status;
                }
            `);

            const processor = new SchemaProcessor({
                additionalProperties: false,
                parallel: false
            });

            const files: FileInfo[] = [{ path: filePath }];
            const schemaMap = await processor.processFiles(files);

            expect(schemaMap.size).toBe(1);
            const schema = schemaMap.get(filePath)!;
            expect(schema.definitions!.Status).toBeDefined();
            expect(schema.definitions!.IUser).toBeDefined();
        });

        it("should handle optional properties", async () => {
            const filePath = await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name?: string;
                    email?: string;
                    age: number;
                }
            `);

            const processor = new SchemaProcessor({
                additionalProperties: false,
                parallel: false
            });

            const files: FileInfo[] = [{ path: filePath }];
            const schemaMap = await processor.processFiles(files);

            const schema = schemaMap.get(filePath)!;
            const userSchema = schema.definitions!.IUser as any;
            
            expect(userSchema.required).toEqual(expect.arrayContaining(["id", "age"]));
            expect(userSchema.required).not.toContain("name");
            expect(userSchema.required).not.toContain("email");
        });

        it("should handle nested interfaces", async () => {
            const filePath = await createTestFile("nested.jsonschema.ts", `
                export interface IAddress {
                    street: string;
                    city: string;
                    country: string;
                }
                
                export interface IUser {
                    id: string;
                    name: string;
                    address: IAddress;
                }
            `);

            const processor = new SchemaProcessor({
                additionalProperties: false,
                parallel: false
            });

            const files: FileInfo[] = [{ path: filePath }];
            const schemaMap = await processor.processFiles(files);

            const schema = schemaMap.get(filePath)!;
            expect(schema.definitions!.IAddress).toBeDefined();
            expect(schema.definitions!.IUser).toBeDefined();
            
            const userSchema = schema.definitions!.IUser as any;
            expect(userSchema.properties.address.$ref).toBe("#/definitions/IAddress");
        });
    });
});