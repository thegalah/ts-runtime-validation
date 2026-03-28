import * as tsj from "ts-json-schema-generator";
import { Config, Schema } from "ts-json-schema-generator";
import assert from "assert";
import path from "path";
import { Project } from "ts-morph";
import { SchemaGenerationError, DuplicateSymbolError } from "../errors";
import { FileInfo } from "./FileDiscovery";

export interface SchemaProcessorOptions {
    additionalProperties: boolean;
    tsconfigPath?: string;
    parallel?: boolean;
    verbose?: boolean;
    glob?: string;
    rootPath?: string;
}

export interface ProcessingResult {
    file: string;
    schema: Schema | null;
    error?: Error;
}

export class SchemaProcessor {
    constructor(private options: SchemaProcessorOptions) {}

    public async processFiles(files: FileInfo[]): Promise<Map<string, Schema>> {
        const { parallel = true, verbose = false, glob, rootPath } = this.options;

        if (verbose) {
            console.log(`Processing ${files.length} files...`);
        }

        // Sort files by path to ensure consistent processing order
        const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

        // Use single-pass processing when possible (avoids creating N TypeScript programs)
        if (glob && rootPath && sortedFiles.length > 1) {
            try {
                return await this.processSinglePass(sortedFiles, rootPath, glob);
            } catch (error) {
                if (verbose) {
                    console.log(`Single-pass processing failed, falling back to per-file processing: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }

        const results = parallel
            ? await this.processInParallel(sortedFiles)
            : await this.processSequentially(sortedFiles);

        return this.consolidateSchemas(results);
    }

    private async processSinglePass(
        files: FileInfo[],
        rootPath: string,
        glob: string
    ): Promise<Map<string, Schema>> {
        const { additionalProperties, tsconfigPath, verbose } = this.options;

        // Pre-check: scan all TS files in rootPath for duplicate exported type names.
        // If duplicates exist, per-file processing is needed to detect schema conflicts.
        if (this.hasDuplicateTypeNames(rootPath)) {
            throw new Error("Duplicate type names detected across source files");
        }

        const resolvedRoot = path.resolve(rootPath);
        const globPattern = path.join(resolvedRoot, "**", glob);

        if (verbose) {
            console.log(`Single-pass processing with pattern: ${globPattern}`);
        }

        const config: Config = {
            path: globPattern,
            type: "*",
            additionalProperties,
            encodeRefs: false,
            sortProps: true,
            ...(tsconfigPath ? { tsconfig: tsconfigPath } : {}),
        };

        const schemaGenerator = tsj.createGenerator(config);
        const fullSchema = schemaGenerator.createSchema(config.type);

        return this.partitionSchemaByFile(files, fullSchema);
    }

    private hasDuplicateTypeNames(rootPath: string): boolean {
        const project = new Project({ skipAddingFilesFromTsConfig: true });
        const allTsFiles = project.addSourceFilesAtPaths(
            path.join(path.resolve(rootPath), "**/*.{ts,tsx}")
        );

        const seen = new Set<string>();

        for (const sf of allTsFiles) {
            const names: string[] = [];
            for (const t of sf.getTypeAliases()) {
                if (t.isExported()) names.push(t.getName());
            }
            for (const i of sf.getInterfaces()) {
                if (i.isExported()) names.push(i.getName());
            }
            for (const e of sf.getEnums()) {
                if (e.isExported()) names.push(e.getName());
            }
            for (const name of names) {
                if (seen.has(name)) return true;
                seen.add(name);
            }
        }

        return false;
    }

    private partitionSchemaByFile(
        files: FileInfo[],
        fullSchema: Schema
    ): Map<string, Schema> {
        const defs = fullSchema.definitions ?? {};
        const schemaVersion = fullSchema.$schema || "http://json-schema.org/draft-07/schema#";
        const schemaMap = new Map<string, Schema>();

        if (Object.keys(defs).length === 0) return schemaMap;

        // Since we've verified no duplicate type names exist, assign all definitions
        // to each file. Downstream code (extractTypeInfo) uses ts-morph to correctly
        // attribute each definition to its actual source file.
        for (const file of files) {
            schemaMap.set(file.path, {
                $schema: schemaVersion,
                definitions: { ...defs },
            });
        }

        return schemaMap;
    }

    private async processInParallel(files: FileInfo[]): Promise<ProcessingResult[]> {
        const promises = files.map(file => this.processFile(file));
        const results = await Promise.allSettled(promises);
        
        // Map results back to original file order to maintain consistency
        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                return {
                    file: files[index].path,
                    schema: null,
                    error: result.reason
                };
            }
        });
    }

    private async processSequentially(files: FileInfo[]): Promise<ProcessingResult[]> {
        const results: ProcessingResult[] = [];
        
        for (const file of files) {
            try {
                const result = await this.processFile(file);
                results.push(result);
            } catch (error) {
                results.push({
                    file: file.path,
                    schema: null,
                    error: error instanceof Error ? error : new Error(String(error))
                });
            }
        }
        
        return results;
    }

    private async processFile(file: FileInfo): Promise<ProcessingResult> {
        const { additionalProperties, tsconfigPath, verbose } = this.options;
        
        try {
            if (verbose) {
                console.log(`Processing: ${file.path}`);
            }

            const config: Config = {
                path: file.path,
                type: "*",
                additionalProperties,
                encodeRefs: false,
                sortProps: true,
                ...(tsconfigPath ? { tsconfig: tsconfigPath } : {}),
            };

            const schemaGenerator = tsj.createGenerator(config);
            const schema = schemaGenerator.createSchema(config.type);
            
            return {
                file: file.path,
                schema,
                error: undefined
            };
        } catch (error) {
            throw new SchemaGenerationError(
                `Failed to process ${file.path}: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    private consolidateSchemas(results: ProcessingResult[]): Map<string, Schema> {
        const schemaMap = new Map<string, Schema>();
        const errors: Error[] = [];
        
        // Sort results by file path to ensure consistent order
        const sortedResults = [...results].sort((a, b) => a.file.localeCompare(b.file));
        
        for (const result of sortedResults) {
            if (result.error) {
                errors.push(result.error);
                continue;
            }
            
            if (result.schema) {
                schemaMap.set(result.file, result.schema);
            }
        }
        
        if (errors.length > 0 && this.options.verbose) {
            console.warn(`Encountered ${errors.length} errors during processing:`);
            errors.forEach(error => console.warn(`  - ${error.message}`));
        }
        
        return schemaMap;
    }

    public validateSchemaCompatibility(schemaMap: Map<string, Schema>): void {
        const definitions: { [id: string]: any } = {};
        
        // Sort by file path for consistent processing order
        const sortedEntries = [...schemaMap.entries()].sort(([a], [b]) => a.localeCompare(b));
        
        for (const [filePath, fileSchema] of sortedEntries) {
            const defs = fileSchema.definitions ?? {};
            
            // Sort definition keys for consistent processing
            Object.keys(defs).sort().forEach((key) => {
                if (definitions[key] !== undefined) {
                    try {
                        assert.deepEqual(definitions[key], defs[key]);
                    } catch (e) {
                        throw new DuplicateSymbolError(
                            `Duplicate symbol '${key}' found with different implementations`,
                            key,
                            filePath,
                            definitions[key],
                            defs[key]
                        );
                    }
                }
                definitions[key] = defs[key];
            });
        }
    }

    public mergeSchemas(schemaMap: Map<string, Schema>): Schema {
        const definitions: { [id: string]: Schema } = {};
        let schemaVersion = "";
        
        // Sort by file path for consistent processing order
        const sortedEntries = [...schemaMap.entries()].sort(([a], [b]) => a.localeCompare(b));
        
        for (const [, fileSchema] of sortedEntries) {
            if (!schemaVersion && fileSchema["$schema"]) {
                schemaVersion = fileSchema["$schema"];
            }
            
            const defs = fileSchema.definitions ?? {};
            // Sort definition keys for consistent processing
            Object.keys(defs).sort().forEach((key) => {
                definitions[key] = defs[key] as Schema;
            });
        }
        
        // Sort definitions alphabetically
        const sortedDefinitions: { [id: string]: Schema } = {};
        Object.keys(definitions).sort().forEach(key => {
            sortedDefinitions[key] = definitions[key];
        });
        
        return {
            $schema: schemaVersion || "http://json-schema.org/draft-07/schema#",
            definitions: sortedDefinitions,
        };
    }
}