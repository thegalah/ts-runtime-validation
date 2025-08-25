import { SchemaGenerator } from "./SchemaGenerator";
import { ICommandOptions } from "./ICommandOptions";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

describe("SchemaGenerator - Deterministic Output", () => {
    const testOutputPath1 = path.join(__dirname, ".test-output-1");
    const testOutputPath2 = path.join(__dirname, ".test-output-2");
    
    beforeEach(() => {
        // Clean up test directories before each test
        [testOutputPath1, testOutputPath2].forEach(dir => {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        });
    });
    
    afterEach(() => {
        // Clean up test directories after each test
        [testOutputPath1, testOutputPath2].forEach(dir => {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        });
    });
    
    const getFileHash = (filePath: string): string => {
        if (!fs.existsSync(filePath)) {
            return "";
        }
        const content = fs.readFileSync(filePath, "utf-8");
        return crypto.createHash("md5").update(content).digest("hex");
    };
    
    const getDirectoryHashes = (dir: string): Map<string, string> => {
        const hashes = new Map<string, string>();
        if (!fs.existsSync(dir)) {
            return hashes;
        }
        
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isFile()) {
                hashes.set(file, getFileHash(filePath));
            }
        });
        
        return hashes;
    };
    
    it("should generate identical output for single file on multiple runs", async () => {
        const options1: ICommandOptions = {
            glob: "test/basic-scenario/*.jsonschema.ts",
            rootPath: path.join(__dirname),
            output: ".test-output-1",
            tsconfigPath: "",
            helpers: true,
            additionalProperties: false,
            verbose: false,
            progress: false,
            minify: false,
            cache: false,
            parallel: true,
            treeShaking: false,
            lazyLoad: false
        };
        
        const options2: ICommandOptions = {
            ...options1,
            output: ".test-output-2"
        };
        
        // First generation
        const generator1 = new SchemaGenerator(options1);
        await generator1.Generate();
        
        // Second generation
        const generator2 = new SchemaGenerator(options2);
        await generator2.Generate();
        
        // Compare hashes
        const hashes1 = getDirectoryHashes(testOutputPath1);
        const hashes2 = getDirectoryHashes(testOutputPath2);
        
        expect(hashes1.size).toBeGreaterThan(0);
        expect(hashes1.size).toBe(hashes2.size);
        
        hashes1.forEach((hash, fileName) => {
            expect(hashes2.get(fileName)).toBe(hash);
        });
    });
    
    it("should generate identical output for multiple files with identical symbols", async () => {
        const options1: ICommandOptions = {
            glob: "test/duplicate-symbols-identitcal-implementation/*.jsonschema.ts",
            rootPath: path.join(__dirname),
            output: ".test-output-1",
            tsconfigPath: "",
            helpers: true,
            additionalProperties: false,
            verbose: false,
            progress: false,
            minify: false,
            cache: false,
            parallel: true,
            treeShaking: false,
            lazyLoad: false
        };
        
        const options2: ICommandOptions = {
            ...options1,
            output: ".test-output-2"
        };
        
        // First generation
        const generator1 = new SchemaGenerator(options1);
        await generator1.Generate();
        
        // Second generation
        const generator2 = new SchemaGenerator(options2);
        await generator2.Generate();
        
        // Compare hashes
        const hashes1 = getDirectoryHashes(testOutputPath1);
        const hashes2 = getDirectoryHashes(testOutputPath2);
        
        expect(hashes1.size).toBeGreaterThan(0);
        expect(hashes1.size).toBe(hashes2.size);
        
        hashes1.forEach((hash, fileName) => {
            expect(hashes2.get(fileName)).toBe(hash);
        });
    });
    
    it("should generate identical output regardless of parallel vs sequential processing", async () => {
        const baseOptions: Omit<ICommandOptions, "output" | "parallel"> = {
            glob: "test/basic-scenario/*.jsonschema.ts",
            rootPath: path.join(__dirname),
            tsconfigPath: "",
            helpers: true,
            additionalProperties: false,
            verbose: false,
            progress: false,
            minify: false,
            cache: false,
            treeShaking: false,
            lazyLoad: false
        };
        
        const optionsParallel: ICommandOptions = {
            ...baseOptions,
            output: ".test-output-1",
            parallel: true
        };
        
        const optionsSequential: ICommandOptions = {
            ...baseOptions,
            output: ".test-output-2",
            parallel: false
        };
        
        // Parallel generation
        const generatorParallel = new SchemaGenerator(optionsParallel);
        await generatorParallel.Generate();
        
        // Sequential generation
        const generatorSequential = new SchemaGenerator(optionsSequential);
        await generatorSequential.Generate();
        
        // Compare hashes
        const hashesParallel = getDirectoryHashes(testOutputPath1);
        const hashesSequential = getDirectoryHashes(testOutputPath2);
        
        expect(hashesParallel.size).toBeGreaterThan(0);
        expect(hashesParallel.size).toBe(hashesSequential.size);
        
        hashesParallel.forEach((hash, fileName) => {
            expect(hashesSequential.get(fileName)).toBe(hash);
        });
    });
    
    it("should generate identical output with different output generation options", async () => {
        // Test that tree-shaking and lazy-load options produce deterministic output
        const baseOptions: Omit<ICommandOptions, "output" | "treeShaking" | "lazyLoad"> = {
            glob: "test/basic-scenario/*.jsonschema.ts",
            rootPath: path.join(__dirname),
            tsconfigPath: "",
            helpers: true,
            additionalProperties: false,
            verbose: false,
            progress: false,
            minify: false,
            cache: false,
            parallel: true
        };
        
        const optionsTreeShaking1: ICommandOptions = {
            ...baseOptions,
            output: ".test-output-1",
            treeShaking: true,
            lazyLoad: false
        };
        
        const optionsTreeShaking2: ICommandOptions = {
            ...baseOptions,
            output: ".test-output-2",
            treeShaking: true,
            lazyLoad: false
        };
        
        // First generation with tree-shaking
        const generator1 = new SchemaGenerator(optionsTreeShaking1);
        await generator1.Generate();
        
        // Second generation with tree-shaking
        const generator2 = new SchemaGenerator(optionsTreeShaking2);
        await generator2.Generate();
        
        // Compare hashes
        const hashes1 = getDirectoryHashes(testOutputPath1);
        const hashes2 = getDirectoryHashes(testOutputPath2);
        
        expect(hashes1.size).toBeGreaterThan(0);
        expect(hashes1.size).toBe(hashes2.size);
        
        hashes1.forEach((hash, fileName) => {
            expect(hashes2.get(fileName)).toBe(hash);
        });
    });
    
    it("should maintain consistent import order in generated files", async () => {
        const options: ICommandOptions = {
            glob: "test/duplicate-symbols-identitcal-implementation/*.jsonschema.ts",
            rootPath: path.join(__dirname),
            output: ".test-output-1",
            tsconfigPath: "",
            helpers: true,
            additionalProperties: false,
            verbose: false,
            progress: false,
            minify: false,
            cache: false,
            parallel: true,
            treeShaking: false,
            lazyLoad: false
        };
        
        const generator = new SchemaGenerator(options);
        await generator.Generate();
        
        // Check that SchemaDefinition.ts has sorted imports
        const schemaDefPath = path.join(testOutputPath1, "SchemaDefinition.ts");
        expect(fs.existsSync(schemaDefPath)).toBe(true);
        
        const schemaDefContent = fs.readFileSync(schemaDefPath, "utf-8");
        const importLines = schemaDefContent
            .split("\n")
            .filter(line => line.startsWith("import"));
        
        // Verify imports are in alphabetical order
        const sortedImports = [...importLines].sort();
        expect(importLines).toEqual(sortedImports);
        
        // Check that ValidationType.ts has sorted imports
        const validationTypePath = path.join(testOutputPath1, "ValidationType.ts");
        expect(fs.existsSync(validationTypePath)).toBe(true);
        
        const validationTypeContent = fs.readFileSync(validationTypePath, "utf-8");
        const validationImportLines = validationTypeContent
            .split("\n")
            .filter(line => line.startsWith("import"));
        
        // Verify imports are in alphabetical order
        const sortedValidationImports = [...validationImportLines].sort();
        expect(validationImportLines).toEqual(sortedValidationImports);
    });
});