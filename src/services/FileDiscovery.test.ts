import fs from "fs";
import path from "path";
import { FileDiscovery } from "./FileDiscovery";
import { FileDiscoveryError } from "../errors";

const testDir = path.resolve(__dirname, "../test-tmp/file-discovery");
const cacheDir = path.resolve(testDir, ".cache");

const createTestFile = async (filePath: string, content: string = "test content") => {
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

describe("FileDiscovery", () => {
    describe("discoverFiles", () => {
        it("should find files matching glob pattern", async () => {
            await createTestFile("types/user.jsonschema.ts", "export interface User {}");
            await createTestFile("types/product.jsonschema.ts", "export interface Product {}");
            await createTestFile("types/order.ts", "export interface Order {}");

            const discovery = new FileDiscovery({
                glob: "*.jsonschema.ts",
                rootPath: testDir
            });

            const files = await discovery.discoverFiles();

            expect(files).toHaveLength(2);
            expect(files.map(f => path.basename(f.path))).toEqual(
                expect.arrayContaining(["user.jsonschema.ts", "product.jsonschema.ts"])
            );
        });

        it("should handle nested directory patterns", async () => {
            await createTestFile("api/v1/user.jsonschema.ts", "export interface User {}");
            await createTestFile("api/v2/product.jsonschema.ts", "export interface Product {}");
            await createTestFile("utils/helper.ts", "export const helper = () => {}");

            const discovery = new FileDiscovery({
                glob: "**/*.jsonschema.ts",
                rootPath: testDir
            });

            const files = await discovery.discoverFiles();

            expect(files).toHaveLength(2);
            expect(files.every(f => f.path.includes(".jsonschema.ts"))).toBe(true);
        });

        it("should throw error when no files found", async () => {
            const discovery = new FileDiscovery({
                glob: "*.jsonschema.ts",
                rootPath: testDir
            });

            await expect(discovery.discoverFiles()).rejects.toThrow(FileDiscoveryError);
        });

        it("should throw error for invalid directory", async () => {
            const discovery = new FileDiscovery({
                glob: "*.jsonschema.ts",
                rootPath: "/nonexistent/path"
            });

            await expect(discovery.discoverFiles()).rejects.toThrow(FileDiscoveryError);
        });
    });

    describe("caching", () => {
        it("should generate file hashes when caching enabled", async () => {
            await createTestFile("user.jsonschema.ts", "export interface User {}");

            const discovery = new FileDiscovery({
                glob: "*.jsonschema.ts",
                rootPath: testDir,
                cacheEnabled: true,
                cachePath: cacheDir
            });

            const files = await discovery.discoverFiles();

            expect(files).toHaveLength(1);
            expect(files[0].hash).toBeDefined();
            expect(files[0].lastModified).toBeDefined();
            expect(typeof files[0].hash).toBe("string");
        });

        it("should save and load cache correctly", async () => {
            await createTestFile("user.jsonschema.ts", "export interface User {}");

            const discovery = new FileDiscovery({
                glob: "*.jsonschema.ts",
                rootPath: testDir,
                cacheEnabled: true,
                cachePath: cacheDir
            });

            // First run - should create cache
            const files1 = await discovery.discoverFiles();
            expect(fs.existsSync(path.join(cacheDir, "file-hashes.json"))).toBe(true);

            // Second run - should load from cache
            const discovery2 = new FileDiscovery({
                glob: "*.jsonschema.ts",
                rootPath: testDir,
                cacheEnabled: true,
                cachePath: cacheDir
            });

            const files2 = await discovery2.discoverFiles();
            expect(files1[0].hash).toBe(files2[0].hash);
        });

        it("should detect file changes", async () => {
            const filePath = await createTestFile("user.jsonschema.ts", "export interface User {}");

            const discovery = new FileDiscovery({
                glob: "*.jsonschema.ts",
                rootPath: testDir,
                cacheEnabled: true,
                cachePath: cacheDir
            });

            const files1 = await discovery.discoverFiles();
            const originalHash = files1[0].hash!;

            // Modify file
            await fs.promises.writeFile(filePath, "export interface User { name: string; }");

            const files2 = await discovery.discoverFiles();
            const newHash = files2[0].hash!;

            expect(discovery.hasFileChanged(filePath, originalHash)).toBe(true);
            expect(originalHash).not.toBe(newHash);
        });

        it("should clear cache correctly", async () => {
            await createTestFile("user.jsonschema.ts", "export interface User {}");

            const discovery = new FileDiscovery({
                glob: "*.jsonschema.ts",
                rootPath: testDir,
                cacheEnabled: true,
                cachePath: cacheDir
            });

            await discovery.discoverFiles();
            expect(fs.existsSync(path.join(cacheDir, "file-hashes.json"))).toBe(true);

            discovery.clearCache();
            expect(fs.existsSync(path.join(cacheDir, "file-hashes.json"))).toBe(false);
        });

        it("should handle corrupted cache gracefully", async () => {
            await createTestFile("user.jsonschema.ts", "export interface User {}");
            
            // Create corrupted cache file
            await fs.promises.mkdir(cacheDir, { recursive: true });
            await fs.promises.writeFile(path.join(cacheDir, "file-hashes.json"), "invalid json");

            const discovery = new FileDiscovery({
                glob: "*.jsonschema.ts",
                rootPath: testDir,
                cacheEnabled: true,
                cachePath: cacheDir
            });

            // Should not throw error and should work normally
            const files = await discovery.discoverFiles();
            expect(files).toHaveLength(1);
        });
    });

    describe("file patterns", () => {
        it("should support multiple extensions", async () => {
            await createTestFile("user.jsonschema.ts", "export interface User {}");
            await createTestFile("product.jsonschema.tsx", "export interface Product {}");
            await createTestFile("order.types.ts", "export interface Order {}");

            const discovery = new FileDiscovery({
                glob: "*.{jsonschema.ts,jsonschema.tsx}",
                rootPath: testDir
            });

            const files = await discovery.discoverFiles();
            expect(files).toHaveLength(2);
        });

        it("should exclude files not matching pattern", async () => {
            await createTestFile("user.jsonschema.ts", "export interface User {}");
            await createTestFile("user.test.ts", "test file");
            await createTestFile("user.spec.ts", "spec file");
            await createTestFile("README.md", "readme");

            const discovery = new FileDiscovery({
                glob: "*.jsonschema.ts",
                rootPath: testDir
            });

            const files = await discovery.discoverFiles();
            expect(files).toHaveLength(1);
            expect(files[0].path).toContain("user.jsonschema.ts");
        });
    });
});