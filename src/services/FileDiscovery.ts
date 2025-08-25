import { fdir } from "fdir";
import picomatch from "picomatch";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { FileDiscoveryError } from "../errors";

export interface FileDiscoveryOptions {
    glob: string;
    rootPath: string;
    cacheEnabled?: boolean;
    cachePath?: string;
}

export interface FileInfo {
    path: string;
    hash?: string;
    lastModified?: Date;
}

export class FileDiscovery {
    private cacheFile: string;
    private fileCache: Map<string, string> = new Map();

    constructor(private options: FileDiscoveryOptions) {
        this.cacheFile = path.join(
            options.cachePath || ".ts-runtime-validation-cache",
            "file-hashes.json"
        );
        if (options.cacheEnabled) {
            this.loadCache();
        }
    }

    public async discoverFiles(): Promise<FileInfo[]> {
        const { glob, rootPath } = this.options;
        
        try {
            const api = new fdir({
                includeBasePath: true,
                includeDirs: false,
                filters: [
                    (filePath) => {
                        return picomatch.isMatch(filePath, glob, { contains: true });
                    },
                ],
            }).crawl(rootPath);

            const files = await api.withPromise();
            
            if (files.length === 0) {
                throw new FileDiscoveryError(
                    `No files found matching pattern: ${glob} in ${rootPath}`
                );
            }

            // Sort files alphabetically to ensure consistent ordering
            const sortedFiles = [...files].sort();

            return this.options.cacheEnabled 
                ? await this.enrichWithCacheInfo(sortedFiles)
                : sortedFiles.map(path => ({ path }));
        } catch (error) {
            if (error instanceof FileDiscoveryError) {
                throw error;
            }
            throw new FileDiscoveryError(
                `Failed to discover files: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    private async enrichWithCacheInfo(files: string[]): Promise<FileInfo[]> {
        const enrichedFiles = await Promise.all(
            files.map(async (filePath) => {
                const stats = await fs.promises.stat(filePath);
                const hash = await this.getFileHash(filePath);
                return {
                    path: filePath,
                    hash,
                    lastModified: stats.mtime
                };
            })
        );
        
        await this.saveCache(enrichedFiles);
        return enrichedFiles;
    }

    private async getFileHash(filePath: string): Promise<string> {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return crypto.createHash('md5').update(content).digest('hex');
    }

    public hasFileChanged(filePath: string, currentHash: string): boolean {
        const cachedHash = this.fileCache.get(filePath);
        return cachedHash !== currentHash;
    }

    private loadCache(): void {
        try {
            if (fs.existsSync(this.cacheFile)) {
                const cacheData = JSON.parse(
                    fs.readFileSync(this.cacheFile, 'utf-8')
                );
                this.fileCache = new Map(Object.entries(cacheData));
            }
        } catch (error) {
            console.warn('Failed to load cache, starting fresh');
            this.fileCache.clear();
        }
    }

    private async saveCache(files: FileInfo[]): Promise<void> {
        const cacheDir = path.dirname(this.cacheFile);
        if (!fs.existsSync(cacheDir)) {
            await fs.promises.mkdir(cacheDir, { recursive: true });
        }

        const cacheData: Record<string, string> = {};
        files.forEach(file => {
            if (file.hash) {
                cacheData[file.path] = file.hash;
                this.fileCache.set(file.path, file.hash);
            }
        });

        await fs.promises.writeFile(
            this.cacheFile,
            JSON.stringify(cacheData, null, 2)
        );
    }

    public clearCache(): void {
        this.fileCache.clear();
        if (fs.existsSync(this.cacheFile)) {
            fs.unlinkSync(this.cacheFile);
        }
    }
}