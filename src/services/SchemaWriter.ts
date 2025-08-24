import fs from "fs";
import path from "path";
import { Schema } from "ts-json-schema-generator";
import { CodeGenerationError } from "../errors";

export interface SchemaWriterOptions {
    outputPath: string;
    minify?: boolean;
}

export class SchemaWriter {
    constructor(private options: SchemaWriterOptions) {}

    public async writeJsonSchema(
        schema: Schema,
        outputFile: string
    ): Promise<void> {
        try {
            await this.ensureOutputPath();
            
            const content = this.options.minify
                ? JSON.stringify(schema)
                : JSON.stringify(schema, null, 4);
                
            await fs.promises.writeFile(outputFile, content, 'utf-8');
        } catch (error) {
            throw new CodeGenerationError(
                `Failed to write JSON schema: ${error instanceof Error ? error.message : String(error)}`,
                outputFile
            );
        }
    }

    public async writeTypeScriptFile(
        content: string,
        outputFile: string
    ): Promise<void> {
        try {
            await this.ensureOutputPath();
            await fs.promises.writeFile(outputFile, content, 'utf-8');
        } catch (error) {
            throw new CodeGenerationError(
                `Failed to write TypeScript file: ${error instanceof Error ? error.message : String(error)}`,
                outputFile
            );
        }
    }

    private async ensureOutputPath(): Promise<void> {
        if (!fs.existsSync(this.options.outputPath)) {
            await fs.promises.mkdir(this.options.outputPath, { recursive: true });
        }
    }

    public async cleanOutputDirectory(): Promise<void> {
        try {
            if (fs.existsSync(this.options.outputPath)) {
                const files = await fs.promises.readdir(this.options.outputPath);
                
                for (const file of files) {
                    const filePath = path.join(this.options.outputPath, file);
                    const stat = await fs.promises.stat(filePath);
                    
                    if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.json'))) {
                        await fs.promises.unlink(filePath);
                    }
                }
            }
        } catch (error) {
            throw new CodeGenerationError(
                `Failed to clean output directory: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}