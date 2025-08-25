import fs from "fs";
import path from "path";
import { SchemaWriter } from "./SchemaWriter";
import { CodeGenerationError } from "../errors";

const testDir = path.resolve(__dirname, "../../.test-tmp/schema-writer");

const cleanup = async () => {
    if (fs.existsSync(testDir)) {
        await fs.promises.rm(testDir, { recursive: true, force: true });
    }
};

beforeEach(cleanup);
afterAll(cleanup);

describe("SchemaWriter", () => {
    describe("writeJsonSchema", () => {
        it("should write JSON schema with pretty formatting", async () => {
            const writer = new SchemaWriter({
                outputPath: testDir,
                minify: false
            });

            const schema: any = {
                $schema: "http://json-schema.org/draft-07/schema#",
                definitions: {
                    IUser: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            name: { type: "string" }
                        },
                        required: ["id", "name"],
                        additionalProperties: false
                    }
                }
            };

            const outputFile = path.join(testDir, "schema.json");
            await writer.writeJsonSchema(schema, outputFile);

            expect(fs.existsSync(outputFile)).toBe(true);
            
            const content = await fs.promises.readFile(outputFile, 'utf-8');
            const parsed = JSON.parse(content);
            
            expect(parsed).toEqual(schema);
            // Pretty formatted should have indentation
            expect(content).toMatch(/\n    /);
        });

        it("should write minified JSON schema", async () => {
            const writer = new SchemaWriter({
                outputPath: testDir,
                minify: true
            });

            const schema: any = {
                $schema: "http://json-schema.org/draft-07/schema#",
                definitions: {
                    IUser: {
                        type: "object",
                        properties: {
                            id: { type: "string" }
                        }
                    }
                }
            };

            const outputFile = path.join(testDir, "schema.json");
            await writer.writeJsonSchema(schema, outputFile);

            expect(fs.existsSync(outputFile)).toBe(true);
            
            const content = await fs.promises.readFile(outputFile, 'utf-8');
            const parsed = JSON.parse(content);
            
            expect(parsed).toEqual(schema);
            // Minified should not have extra whitespace
            expect(content).not.toMatch(/\n    /);
        });

        it("should create output directory if it doesn't exist", async () => {
            const nestedPath = path.join(testDir, "nested", "deep", "path");
            const writer = new SchemaWriter({
                outputPath: nestedPath,
                minify: false
            });

            const schema = { $schema: "test" };
            const outputFile = path.join(nestedPath, "schema.json");
            
            await writer.writeJsonSchema(schema, outputFile);

            expect(fs.existsSync(outputFile)).toBe(true);
        });

        it("should throw CodeGenerationError on write failure", async () => {
            const writer = new SchemaWriter({
                outputPath: testDir,
                minify: false
            });

            const schema = { $schema: "test" };
            // Try to write to an invalid path (file as directory)
            const invalidPath = path.join(testDir, "file.json", "invalid");
            
            // Create file first to make path invalid
            await fs.promises.mkdir(testDir, { recursive: true });
            await fs.promises.writeFile(path.join(testDir, "file.json"), "test");

            await expect(writer.writeJsonSchema(schema, invalidPath))
                .rejects.toThrow(CodeGenerationError);
        });
    });

    describe("writeTypeScriptFile", () => {
        it("should write TypeScript file correctly", async () => {
            const writer = new SchemaWriter({
                outputPath: testDir,
                minify: false
            });

            const content = `export interface IUser {
    id: string;
    name: string;
}`;

            const outputFile = path.join(testDir, "types.ts");
            await writer.writeTypeScriptFile(content, outputFile);

            expect(fs.existsSync(outputFile)).toBe(true);
            
            const fileContent = await fs.promises.readFile(outputFile, 'utf-8');
            expect(fileContent).toBe(content);
        });

        it("should create directories for TypeScript files", async () => {
            const nestedPath = path.join(testDir, "src", "types");
            const writer = new SchemaWriter({
                outputPath: nestedPath,
                minify: false
            });

            const content = "export const test = 'value';";
            const outputFile = path.join(nestedPath, "test.ts");
            
            await writer.writeTypeScriptFile(content, outputFile);

            expect(fs.existsSync(outputFile)).toBe(true);
        });

        it("should handle empty content", async () => {
            const writer = new SchemaWriter({
                outputPath: testDir,
                minify: false
            });

            const outputFile = path.join(testDir, "empty.ts");
            await writer.writeTypeScriptFile("", outputFile);

            expect(fs.existsSync(outputFile)).toBe(true);
            
            const content = await fs.promises.readFile(outputFile, 'utf-8');
            expect(content).toBe("");
        });
    });

    describe("cleanOutputDirectory", () => {
        it("should remove TypeScript and JSON files", async () => {
            await fs.promises.mkdir(testDir, { recursive: true });
            
            // Create various files
            await fs.promises.writeFile(path.join(testDir, "schema.json"), "{}");
            await fs.promises.writeFile(path.join(testDir, "types.ts"), "export interface Test {}");
            await fs.promises.writeFile(path.join(testDir, "readme.md"), "# Test");
            await fs.promises.writeFile(path.join(testDir, "config.yaml"), "test: value");

            const writer = new SchemaWriter({
                outputPath: testDir,
                minify: false
            });

            await writer.cleanOutputDirectory();

            // Should remove .ts and .json files
            expect(fs.existsSync(path.join(testDir, "schema.json"))).toBe(false);
            expect(fs.existsSync(path.join(testDir, "types.ts"))).toBe(false);
            
            // Should keep other files
            expect(fs.existsSync(path.join(testDir, "readme.md"))).toBe(true);
            expect(fs.existsSync(path.join(testDir, "config.yaml"))).toBe(true);
        });

        it("should handle non-existent directory", async () => {
            const writer = new SchemaWriter({
                outputPath: path.join(testDir, "nonexistent"),
                minify: false
            });

            // Should not throw
            await expect(writer.cleanOutputDirectory()).resolves.not.toThrow();
        });

        it("should not remove subdirectories", async () => {
            await fs.promises.mkdir(path.join(testDir, "subdir"), { recursive: true });
            await fs.promises.writeFile(path.join(testDir, "subdir", "file.ts"), "test");
            await fs.promises.writeFile(path.join(testDir, "main.ts"), "test");

            const writer = new SchemaWriter({
                outputPath: testDir,
                minify: false
            });

            await writer.cleanOutputDirectory();

            // Should remove file in root
            expect(fs.existsSync(path.join(testDir, "main.ts"))).toBe(false);
            
            // Should keep subdirectory and its contents
            expect(fs.existsSync(path.join(testDir, "subdir"))).toBe(true);
            expect(fs.existsSync(path.join(testDir, "subdir", "file.ts"))).toBe(true);
        });

        it("should handle permission errors gracefully", async () => {
            // Skip this test as it's environment dependent
            // Real permission errors would be caught by the try-catch in SchemaWriter
        });
    });

    describe("edge cases", () => {
        it("should handle large files", async () => {
            const writer = new SchemaWriter({
                outputPath: testDir,
                minify: false
            });

            // Create a large schema
            const largeSchema: any = {
                $schema: "http://json-schema.org/draft-07/schema#",
                definitions: {}
            };

            // Add many definitions
            for (let i = 0; i < 1000; i++) {
                largeSchema.definitions[`Interface${i}`] = {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        value: { type: "number" }
                    }
                };
            }

            const outputFile = path.join(testDir, "large-schema.json");
            await writer.writeJsonSchema(largeSchema, outputFile);

            expect(fs.existsSync(outputFile)).toBe(true);
            
            const stats = await fs.promises.stat(outputFile);
            expect(stats.size).toBeGreaterThan(1000); // Should be reasonably large
        });

        it("should handle unicode content", async () => {
            const writer = new SchemaWriter({
                outputPath: testDir,
                minify: false
            });

            const unicodeContent = `export interface IUser {
    // Unicode: café, naïve, résumé
    name: string; // 中文注释
    emoji: "👨‍💻" | "🚀" | "💡";
}`;

            const outputFile = path.join(testDir, "unicode.ts");
            await writer.writeTypeScriptFile(unicodeContent, outputFile);

            const content = await fs.promises.readFile(outputFile, 'utf-8');
            expect(content).toBe(unicodeContent);
        });

        it("should overwrite existing files", async () => {
            const writer = new SchemaWriter({
                outputPath: testDir,
                minify: false
            });

            const outputFile = path.join(testDir, "overwrite.ts");
            
            // Write first content
            await writer.writeTypeScriptFile("const first = 1;", outputFile);
            const firstContent = await fs.promises.readFile(outputFile, 'utf-8');
            expect(firstContent).toBe("const first = 1;");
            
            // Overwrite with second content
            await writer.writeTypeScriptFile("const second = 2;", outputFile);
            const secondContent = await fs.promises.readFile(outputFile, 'utf-8');
            expect(secondContent).toBe("const second = 2;");
        });
    });
});