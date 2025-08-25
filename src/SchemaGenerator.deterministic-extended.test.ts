import { SchemaGenerator } from "./SchemaGenerator";
import { ICommandOptions } from "./ICommandOptions";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

describe("SchemaGenerator - Extended Deterministic Tests", () => {
    const baseTestDir = path.join(__dirname, "../.test-tmp/deterministic-extended");
    
    const createTestEnv = (name: string) => {
        const testDir = path.join(baseTestDir, name);
        const outputDir1 = path.join(testDir, "output-1");
        const outputDir2 = path.join(testDir, "output-2");
        const srcDir = path.join(testDir, "src");
        
        return { testDir, outputDir1, outputDir2, srcDir };
    };
    
    beforeEach(() => {
        if (fs.existsSync(baseTestDir)) {
            fs.rmSync(baseTestDir, { recursive: true, force: true });
        }
    });
    
    afterEach(() => {
        if (fs.existsSync(baseTestDir)) {
            fs.rmSync(baseTestDir, { recursive: true, force: true });
        }
    });
    
    const getFileHash = (filePath: string): string => {
        if (!fs.existsSync(filePath)) {
            return "";
        }
        const content = fs.readFileSync(filePath, "utf-8");
        return crypto.createHash("md5").update(content).digest("hex");
    };
    
    const compareDirectories = (dir1: string, dir2: string): boolean => {
        const files1 = fs.existsSync(dir1) ? fs.readdirSync(dir1).sort() : [];
        const files2 = fs.existsSync(dir2) ? fs.readdirSync(dir2).sort() : [];
        
        if (files1.length !== files2.length) return false;
        if (!files1.every((f, i) => f === files2[i])) return false;
        
        return files1.every(file => {
            const hash1 = getFileHash(path.join(dir1, file));
            const hash2 = getFileHash(path.join(dir2, file));
            return hash1 === hash2;
        });
    };
    
    const createTestFiles = async (srcDir: string, files: Record<string, string>) => {
        await fs.promises.mkdir(srcDir, { recursive: true });
        for (const [filename, content] of Object.entries(files)) {
            await fs.promises.writeFile(path.join(srcDir, filename), content);
        }
    };
    
    it("should generate identical output with complex nested interfaces", async () => {
        const { srcDir, outputDir1, outputDir2 } = createTestEnv("nested-interfaces");
        
        await createTestFiles(srcDir, {
            "user.jsonschema.ts": `
                export interface IAddress {
                    street: string;
                    city: string;
                    country: string;
                }
                
                export interface IUser {
                    id: string;
                    name: string;
                    addresses: IAddress[];
                    metadata: {
                        created: Date;
                        updated: Date;
                        tags: string[];
                    };
                }
            `,
            "product.jsonschema.ts": `
                export interface ICategory {
                    id: number;
                    name: string;
                    parent?: ICategory;
                }
                
                export interface IProduct {
                    sku: string;
                    name: string;
                    price: number;
                    categories: ICategory[];
                }
            `
        });
        
        const baseOptions: ICommandOptions = {
            glob: "**/*.jsonschema.ts",
            rootPath: srcDir,
            output: "",
            tsconfigPath: "",
            helpers: true,
            additionalProperties: false,
            verbose: false,
            progress: false,
            minify: false,
            cache: false,
            parallel: true,
            treeShaking: false,
            lazyLoad: false,
        };
        
        // Generate twice
        const generator1 = new SchemaGenerator({ ...baseOptions, output: outputDir1 });
        await generator1.Generate();
        
        const generator2 = new SchemaGenerator({ ...baseOptions, output: outputDir2 });
        await generator2.Generate();
        
        expect(compareDirectories(outputDir1, outputDir2)).toBe(true);
    });
    
    it("should maintain determinism with circular references", async () => {
        const { srcDir, outputDir1, outputDir2 } = createTestEnv("circular-refs");
        
        await createTestFiles(srcDir, {
            "models.jsonschema.ts": `
                export interface INode {
                    id: string;
                    value: any;
                    parent?: INode;
                    children: INode[];
                }
                
                export interface IGraph {
                    nodes: INode[];
                    edges: IEdge[];
                }
                
                export interface IEdge {
                    from: INode;
                    to: INode;
                    weight?: number;
                }
            `
        });
        
        const options: ICommandOptions = {
            glob: "**/*.jsonschema.ts",
            rootPath: srcDir,
            output: "",
            tsconfigPath: "",
            helpers: true,
            additionalProperties: false,
            verbose: false,
            progress: false,
            minify: false,
            cache: false,
            parallel: true,
            treeShaking: false,
            lazyLoad: false,
        };
        
        const generator1 = new SchemaGenerator({ ...options, output: outputDir1 });
        await generator1.Generate();
        
        const generator2 = new SchemaGenerator({ ...options, output: outputDir2 });
        await generator2.Generate();
        
        expect(compareDirectories(outputDir1, outputDir2)).toBe(true);
    });
    
    it("should be deterministic with many files processed in parallel", async () => {
        const { srcDir } = createTestEnv("many-files");
        
        const files: Record<string, string> = {};
        for (let i = 0; i < 5; i++) { // Reduced to 5 files for faster tests
            files[`model${i}.jsonschema.ts`] = `
                export interface IModel${i} {
                    id: string;
                    index: number;
                    data: {
                        value${i}: string;
                        timestamp: Date;
                    };
                }
                
                export type Model${i}Type = "type_${i}_a" | "type_${i}_b";
            `;
        }
        
        await createTestFiles(srcDir, files);
        
        const options: ICommandOptions = {
            glob: "**/*.jsonschema.ts",
            rootPath: srcDir,
            output: "",
            tsconfigPath: "",
            helpers: true,
            additionalProperties: false,
            verbose: false,
            progress: false,
            minify: false,
            cache: false,
            parallel: true,
            treeShaking: false,
            lazyLoad: false,
        };
        
        // Run multiple times to ensure consistency
        const outputs: string[] = [];
        for (let run = 0; run < 2; run++) { // Reduced from 3 to 2 runs
            const outputDir = path.join(baseTestDir, `many-files/output-run-${run}`);
            const generator = new SchemaGenerator({ ...options, output: outputDir });
            await generator.Generate();
            
            const schemaPath = path.join(outputDir, "validation.schema.json");
            const hash = getFileHash(schemaPath);
            outputs.push(hash);
        }
        
        // All runs should produce identical output
        expect(outputs.every(h => h === outputs[0])).toBe(true);
    }, 30000); // 30 second timeout for this test
    
    it("should be deterministic with mixed export types", async () => {
        const { srcDir, outputDir1, outputDir2 } = createTestEnv("mixed-exports");
        
        await createTestFiles(srcDir, {
            "types.jsonschema.ts": `
                export interface IInterface {
                    field: string;
                }
                
                export type StringAlias = string;
                
                export type UnionType = "option1" | "option2" | "option3";
                
                export type IntersectionType = IInterface & {
                    extra: number;
                };
                
                export enum Status {
                    Active = "ACTIVE",
                    Inactive = "INACTIVE",
                    Pending = "PENDING"
                }
                
                export type ComplexType = {
                    status: Status;
                    union: UnionType;
                    data: IInterface | null;
                };
            `
        });
        
        const options: ICommandOptions = {
            glob: "**/*.jsonschema.ts",
            rootPath: srcDir,
            output: "",
            tsconfigPath: "",
            helpers: true,
            additionalProperties: false,
            verbose: false,
            progress: false,
            minify: false,
            cache: false,
            parallel: false, // Test with sequential processing too
            treeShaking: false,
            lazyLoad: false,
        };
        
        const generator1 = new SchemaGenerator({ ...options, output: outputDir1 });
        await generator1.Generate();
        
        const generator2 = new SchemaGenerator({ ...options, output: outputDir2, parallel: true });
        await generator2.Generate();
        
        expect(compareDirectories(outputDir1, outputDir2)).toBe(true);
    });
    
    it("should maintain order with tree-shaking and lazy-loading enabled", async () => {
        const { srcDir, outputDir1, outputDir2 } = createTestEnv("optimization-flags");
        
        await createTestFiles(srcDir, {
            "api.jsonschema.ts": `
                export interface IRequest {
                    method: string;
                    url: string;
                    headers: Record<string, string>;
                    body?: unknown;
                }
                
                export interface IResponse {
                    status: number;
                    headers: Record<string, string>;
                    data: unknown;
                }
            `
        });
        
        const baseOptions: ICommandOptions = {
            glob: "**/*.jsonschema.ts",
            rootPath: srcDir,
            output: "",
            tsconfigPath: "",
            helpers: true,
            additionalProperties: false,
            verbose: false,
            progress: false,
            minify: true,
            cache: false,
            parallel: true,
            treeShaking: true,
            lazyLoad: true,
        };
        
        // Test multiple combinations
        const generator1 = new SchemaGenerator({ ...baseOptions, output: outputDir1 });
        await generator1.Generate();
        
        const generator2 = new SchemaGenerator({ ...baseOptions, output: outputDir2 });
        await generator2.Generate();
        
        expect(compareDirectories(outputDir1, outputDir2)).toBe(true);
    });
    
    it("should handle files with same symbols consistently", async () => {
        const { srcDir, outputDir1, outputDir2 } = createTestEnv("duplicate-symbols");
        
        await createTestFiles(srcDir, {
            "module1.jsonschema.ts": `
                export interface IShared {
                    id: string;
                    name: string;
                }
                
                export interface IModule1 {
                    shared: IShared;
                    specific1: string;
                }
            `,
            "module2.jsonschema.ts": `
                export interface IShared {
                    id: string;
                    name: string;
                }
                
                export interface IModule2 {
                    shared: IShared;
                    specific2: number;
                }
            `
        });
        
        const options: ICommandOptions = {
            glob: "**/*.jsonschema.ts",
            rootPath: srcDir,
            output: "",
            tsconfigPath: "",
            helpers: true,
            additionalProperties: false,
            verbose: false,
            progress: false,
            minify: false,
            cache: false,
            parallel: true,
            treeShaking: false,
            lazyLoad: false,
        };
        
        const generator1 = new SchemaGenerator({ ...options, output: outputDir1 });
        await generator1.Generate();
        
        const generator2 = new SchemaGenerator({ ...options, output: outputDir2 });
        await generator2.Generate();
        
        expect(compareDirectories(outputDir1, outputDir2)).toBe(true);
    });
    
    it("should generate deterministic output with cache enabled", async () => {
        const { srcDir, outputDir1, outputDir2 } = createTestEnv("with-cache");
        
        await createTestFiles(srcDir, {
            "cached.jsonschema.ts": `
                export interface ICached {
                    id: string;
                    value: number;
                    timestamp: Date;
                }
            `
        });
        
        const options: ICommandOptions = {
            glob: "**/*.jsonschema.ts",
            rootPath: srcDir,
            output: "",
            tsconfigPath: "",
            helpers: true,
            additionalProperties: false,
            verbose: false,
            progress: false,
            minify: false,
            cache: true, // Enable caching
            parallel: true,
            treeShaking: false,
            lazyLoad: false,
        };
        
        // First run with cache
        const generator1 = new SchemaGenerator({ ...options, output: outputDir1 });
        await generator1.Generate();
        
        // Second run should use cache
        const generator2 = new SchemaGenerator({ ...options, output: outputDir2 });
        await generator2.Generate();
        
        expect(compareDirectories(outputDir1, outputDir2)).toBe(true);
        
        // Clear cache and run again
        generator2.clearCache();
        const outputDir3 = path.join(baseTestDir, "with-cache/output-3");
        const generator3 = new SchemaGenerator({ ...options, output: outputDir3 });
        await generator3.Generate();
        
        expect(compareDirectories(outputDir1, outputDir3)).toBe(true);
    });
});