import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";

describe("CLI Arguments", () => {
    const cliPath = path.join(__dirname, "..", "dist", "index.js");
    const testOutputPath = path.join(__dirname, "../.test-tmp/cli-output");
    
    beforeEach(() => {
        if (fs.existsSync(testOutputPath)) {
            fs.rmSync(testOutputPath, { recursive: true, force: true });
        }
    });
    
    afterEach(() => {
        if (fs.existsSync(testOutputPath)) {
            fs.rmSync(testOutputPath, { recursive: true, force: true });
        }
    });
    
    const runCLI = (args: string[]): Promise<{ code: number; stdout: string; stderr: string }> => {
        return new Promise((resolve) => {
            const proc = spawn("node", [cliPath, ...args]);
            let stdout = "";
            let stderr = "";
            
            proc.stdout.on("data", (data) => {
                stdout += data.toString();
            });
            
            proc.stderr.on("data", (data) => {
                stderr += data.toString();
            });
            
            proc.on("close", (code) => {
                resolve({ code: code || 0, stdout, stderr });
            });
        });
    };
    
    it("should accept glob pattern with --glob parameter", async () => {
        const result = await runCLI([
            "--glob", "test/basic-scenario/*.jsonschema.ts",
            "--rootPath", path.join(__dirname),
            "--output", "../.test-tmp/cli-output"
        ]);
        
        expect(result.code).toBe(0);
        expect(fs.existsSync(testOutputPath)).toBe(true);
        
        // Check that files were generated
        const generatedFiles = fs.readdirSync(testOutputPath);
        expect(generatedFiles).toContain("validation.schema.json");
        expect(generatedFiles).toContain("SchemaDefinition.ts");
        expect(generatedFiles).toContain("ValidationType.ts");
        expect(generatedFiles).toContain("isValidSchema.ts");
    });
    
    it("should use default glob pattern when --glob is not provided", async () => {
        // Create test files matching the default pattern
        const testDir = path.join(__dirname, "test-default-glob");
        const testFile1 = path.join(testDir, "test.jsonschema.ts");
        const testFile2 = path.join(testDir, "test2.jsonschema.tsx");
        
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        
        fs.writeFileSync(testFile1, "export interface TestInterface { test: string; }");
        fs.writeFileSync(testFile2, "export interface TestInterface2 { test2: number; }");
        
        try {
            const result = await runCLI([
                "--rootPath", testDir,
                "--output", path.join("..", "../.test-tmp/cli-output")
            ]);
            
            expect(result.code).toBe(0);
            expect(fs.existsSync(testOutputPath)).toBe(true);
        } finally {
            // Clean up test files and directory
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true, force: true });
            }
        }
    });
    
    it("should accept all supported CLI options", async () => {
        const result = await runCLI([
            "--glob", "test/basic-scenario/*.jsonschema.ts",
            "--rootPath", path.join(__dirname),
            "--output", "../.test-tmp/cli-output",
            "--additionalProperties",
            "--verbose",
            "--progress",
            "--minify",
            "--cache",
            "--tree-shaking",
            "--lazy-load"
        ]);
        
        expect(result.code).toBe(0);
        // With verbose flag, we should see output
        expect(result.stdout).toContain("Found");
    });
    
    it("should handle parallel processing flags correctly", async () => {
        // Test with parallel disabled
        const result = await runCLI([
            "--glob", "test/basic-scenario/*.jsonschema.ts",
            "--rootPath", path.join(__dirname),
            "--output", "../.test-tmp/cli-output",
            "--no-parallel"
        ]);
        
        expect(result.code).toBe(0);
        expect(fs.existsSync(testOutputPath)).toBe(true);
    });
    
    it("should error gracefully when no matching files are found", async () => {
        const result = await runCLI([
            "--glob", "nonexistent/*.jsonschema.ts",
            "--rootPath", path.join(__dirname),
            "--output", "../.test-tmp/cli-output"
        ]);
        
        expect(result.code).not.toBe(0);
        expect(result.stderr).toContain("No files found");
    });
});