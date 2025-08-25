import fs from "fs";
import path from "path";
import { SchemaGenerator } from "./SchemaGenerator";
import { ICommandOptions } from "./ICommandOptions";

const testDir = path.resolve(__dirname, "../.test-tmp/integration");

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

const getGeneratorConfig = (overrides: Partial<ICommandOptions> = {}): ICommandOptions => ({
    glob: "*.jsonschema.ts",
    rootPath: testDir,
    output: "./output",
    helpers: true,
    additionalProperties: false,
    tsconfigPath: "",
    verbose: false,
    progress: false,
    minify: false,
    cache: false,
    parallel: false,
    treeShaking: false,
    lazyLoad: false,
    ...overrides
});

beforeEach(cleanup);
afterAll(cleanup);

describe("SchemaGenerator Integration Tests", () => {
    describe("new CLI options", () => {
        it("should work with verbose mode enabled", async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            const generator = new SchemaGenerator(getGeneratorConfig({
                verbose: true
            }));

            await generator.Generate();

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Found 1 schema file(s)"));
            
            consoleSpy.mockRestore();
        });

        it("should work with progress reporting enabled", async () => {
            await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            const generator = new SchemaGenerator(getGeneratorConfig({
                progress: true
            }));

            await generator.Generate();

            // Check that output files were generated
            const outputDir = path.join(testDir, "output");
            expect(fs.existsSync(path.join(outputDir, "validation.schema.json"))).toBe(true);
            expect(fs.existsSync(path.join(outputDir, "SchemaDefinition.ts"))).toBe(true);
        });

        it("should work with caching enabled", async () => {
            await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            const generator = new SchemaGenerator(getGeneratorConfig({
                cache: true
            }));

            await generator.Generate();

            // Check that cache was created
            const cacheDir = path.join(testDir, ".ts-runtime-validation-cache");
            expect(fs.existsSync(path.join(cacheDir, "file-hashes.json"))).toBe(true);

            // Run again to test cache usage
            await generator.Generate();
            
            const outputDir = path.join(testDir, "output");
            expect(fs.existsSync(path.join(outputDir, "validation.schema.json"))).toBe(true);
        });

        it("should work with parallel processing enabled", async () => {
            await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            await createTestFile("product.jsonschema.ts", `
                export interface IProduct {
                    id: string;
                    title: string;
                    price: number;
                }
            `);

            const generator = new SchemaGenerator(getGeneratorConfig({
                parallel: true
            }));

            await generator.Generate();

            // Check that both interfaces were processed
            const schemaFile = path.join(testDir, "output", "validation.schema.json");
            const schemaContent = JSON.parse(fs.readFileSync(schemaFile, 'utf-8'));
            
            expect(schemaContent.definitions.IUser).toBeDefined();
            expect(schemaContent.definitions.IProduct).toBeDefined();
        });

        it("should work with minified output", async () => {
            await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            const generator = new SchemaGenerator(getGeneratorConfig({
                minify: true
            }));

            await generator.Generate();

            // Check that JSON schema is minified (no pretty formatting)
            const schemaFile = path.join(testDir, "output", "validation.schema.json");
            const schemaContent = fs.readFileSync(schemaFile, 'utf-8');
            
            // Minified JSON shouldn't have indentation
            expect(schemaContent).not.toMatch(/\n    /);
            
            // But should still be valid JSON
            expect(() => JSON.parse(schemaContent)).not.toThrow();
        });

        it("should work with tree-shaking enabled", async () => {
            await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            const generator = new SchemaGenerator(getGeneratorConfig({
                treeShaking: true
            }));

            await generator.Generate();

            // Check that ValidationType.ts has individual exports instead of namespace
            const validationTypesFile = path.join(testDir, "output", "ValidationType.ts");
            const content = fs.readFileSync(validationTypesFile, 'utf-8');
            
            expect(content).toContain("export type IUser");
            expect(content).not.toContain("namespace ValidationType");
        });

        it("should work with lazy loading enabled", async () => {
            await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            const generator = new SchemaGenerator(getGeneratorConfig({
                lazyLoad: true
            }));

            await generator.Generate();

            // Check that isValidSchema.ts uses lazy loading
            const validatorFile = path.join(testDir, "output", "isValidSchema.ts");
            const content = fs.readFileSync(validatorFile, 'utf-8');
            
            expect(content).toContain("let validator");
            expect(content).toContain("getValidator");
            expect(content).toContain("require(\"ajv\")");
        });
    });

    describe("combined options", () => {
        it("should work with multiple options enabled", async () => {
            await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            await createTestFile("product.jsonschema.ts", `
                export interface IProduct {
                    id: string;
                    title: string;
                }
            `);

            const generator = new SchemaGenerator(getGeneratorConfig({
                verbose: true,
                progress: true,
                cache: true,
                parallel: true,
                minify: true,
                treeShaking: true
            }));

            await generator.Generate();

            // Verify all features work together
            const outputDir = path.join(testDir, "output");
            const cacheDir = path.join(testDir, ".ts-runtime-validation-cache");
            
            // Check files exist
            expect(fs.existsSync(path.join(outputDir, "validation.schema.json"))).toBe(true);
            expect(fs.existsSync(path.join(outputDir, "SchemaDefinition.ts"))).toBe(true);
            expect(fs.existsSync(path.join(outputDir, "ValidationType.ts"))).toBe(true);
            expect(fs.existsSync(path.join(cacheDir, "file-hashes.json"))).toBe(true);
            
            // Check minification
            const schemaContent = fs.readFileSync(path.join(outputDir, "validation.schema.json"), 'utf-8');
            expect(schemaContent).not.toMatch(/\n    /);
            
            // Check tree-shaking
            const validationTypesContent = fs.readFileSync(path.join(outputDir, "ValidationType.ts"), 'utf-8');
            expect(validationTypesContent).toContain("export type IUser");
            expect(validationTypesContent).not.toContain("namespace ValidationType");
        });
    });

    describe("error handling with new options", () => {
        it("should handle errors gracefully with verbose mode", async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            
            // Use non-existent glob pattern to trigger error
            const generator = new SchemaGenerator(getGeneratorConfig({
                glob: "*.nonexistent.ts",
                verbose: true
            }));

            await expect(generator.Generate()).rejects.toThrow();
            
            consoleErrorSpy.mockRestore();
        });

        it("should provide detailed error context", async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            
            const generator = new SchemaGenerator(getGeneratorConfig({
                glob: "*.nonexistent.ts", // Pattern that won't match any files
                verbose: true
            }));

            await expect(generator.Generate()).rejects.toThrow();
            
            consoleErrorSpy.mockRestore();
        });
    });

    describe("cache functionality", () => {
        it("should invalidate cache when file changes", async () => {
            const filePath = await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            const generator = new SchemaGenerator(getGeneratorConfig({
                cache: true
            }));

            // First run
            await generator.Generate();
            
            const cacheFile = path.join(testDir, ".ts-runtime-validation-cache", "file-hashes.json");
            expect(fs.existsSync(cacheFile)).toBe(true);
            
            const originalCache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
            
            // Modify file
            await fs.promises.writeFile(filePath, `
                export interface IUser {
                    id: string;
                    name: string;
                    email: string; // Added field
                }
            `);
            
            // Second run
            await generator.Generate();
            
            const updatedCache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
            
            // Hash should have changed
            expect(originalCache[filePath]).not.toBe(updatedCache[filePath]);
        });

        it("should clear cache correctly", async () => {
            await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            const generator = new SchemaGenerator(getGeneratorConfig({
                cache: true
            }));

            await generator.Generate();
            
            const cacheFile = path.join(testDir, ".ts-runtime-validation-cache", "file-hashes.json");
            expect(fs.existsSync(cacheFile)).toBe(true);
            
            generator.clearCache();
            expect(fs.existsSync(cacheFile)).toBe(false);
        });
    });

    describe("output management", () => {
        it("should clean output directory", async () => {
            await createTestFile("user.jsonschema.ts", `
                export interface IUser {
                    id: string;
                    name: string;
                }
            `);

            const generator = new SchemaGenerator(getGeneratorConfig());

            // Generate first time
            await generator.Generate();
            
            const outputDir = path.join(testDir, "output");
            expect(fs.existsSync(path.join(outputDir, "validation.schema.json"))).toBe(true);
            
            // Clean output
            await generator.cleanOutput();
            
            // TypeScript and JSON files should be removed
            expect(fs.existsSync(path.join(outputDir, "validation.schema.json"))).toBe(false);
            expect(fs.existsSync(path.join(outputDir, "SchemaDefinition.ts"))).toBe(false);
        });
    });

    describe("performance with different options", () => {
        it("should process multiple files efficiently with parallel mode", async () => {
            // Create multiple test files
            const numFiles = 5;
            for (let i = 0; i < numFiles; i++) {
                await createTestFile(`interface${i}.jsonschema.ts`, `
                    export interface IInterface${i} {
                        id: string;
                        name: string;
                        value${i}: number;
                    }
                `);
            }

            const startTime = Date.now();
            
            const generator = new SchemaGenerator(getGeneratorConfig({
                parallel: true
            }));

            await generator.Generate();
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete reasonably quickly (less than 20 seconds)
            expect(duration).toBeLessThan(20000);
            
            // Verify all files were processed
            const schemaFile = path.join(testDir, "output", "validation.schema.json");
            const schemaContent = JSON.parse(fs.readFileSync(schemaFile, 'utf-8'));
            
            for (let i = 0; i < numFiles; i++) {
                expect(schemaContent.definitions[`IInterface${i}`]).toBeDefined();
            }
        });
    });
});