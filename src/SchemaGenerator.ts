import { ICommandOptions } from "./ICommandOptions";
import path from "path";
import { FileDiscovery } from "./services/FileDiscovery";
import { SchemaProcessor } from "./services/SchemaProcessor";
import { CodeGenerator } from "./services/CodeGenerator";
import { SchemaWriter } from "./services/SchemaWriter";
import { ProgressReporter } from "./utils/ProgressReporter";
import { formatError, isKnownError } from "./errors";

const validationSchemaFileName = "validation.schema.json";
const schemaDefinitionFileName = "SchemaDefinition.ts";
const validationInterfacesFile = "ValidationType.ts";
const isValidSchemaFileName = "isValidSchema.ts";

export class SchemaGenerator {
    private outputPath = path.join(this.options.rootPath, this.options.output);
    private jsonSchemaOutputFile = path.join(this.outputPath, validationSchemaFileName);
    private tsSchemaDefinitionOutputFile = path.join(this.outputPath, schemaDefinitionFileName);
    private validationTypesOutputFile = path.join(this.outputPath, validationInterfacesFile);
    private isValidSchemaOutputFile = path.join(this.outputPath, isValidSchemaFileName);
    
    private fileDiscovery: FileDiscovery;
    private schemaProcessor: SchemaProcessor;
    private codeGenerator: CodeGenerator;
    private schemaWriter: SchemaWriter;
    private progressReporter: ProgressReporter;

    public constructor(private options: ICommandOptions) {
        this.fileDiscovery = new FileDiscovery({
            glob: options.glob,
            rootPath: options.rootPath,
            cacheEnabled: options.cache || false,
            cachePath: path.join(options.rootPath, ".ts-runtime-validation-cache")
        });
        
        this.schemaProcessor = new SchemaProcessor({
            additionalProperties: options.additionalProperties,
            tsconfigPath: options.tsconfigPath || undefined,
            parallel: options.parallel !== false,
            verbose: options.verbose || false
        });
        
        this.codeGenerator = new CodeGenerator({
            outputPath: this.outputPath,
            minify: options.minify || false,
            treeShaking: options.treeShaking || false,
            lazyLoad: options.lazyLoad || false
        });
        
        this.schemaWriter = new SchemaWriter({
            outputPath: this.outputPath,
            minify: options.minify || false
        });
        
        this.progressReporter = new ProgressReporter({
            enabled: options.progress || false,
            showBar: true
        });
    }

    public Generate = async () => {
        try {
            this.progressReporter.start("Starting schema generation...");
            
            const { helpers } = this.options;
            
            // Discover files
            this.progressReporter.update(0, "Discovering files...");
            const files = await this.fileDiscovery.discoverFiles();
            
            if (this.options.verbose) {
                console.log(`Found ${files.length} schema file(s)`);
                files.forEach(file => console.log(`  - ${file.path}`));
            }
            
            // Process schemas
            this.progressReporter.update(1, "Processing TypeScript files...");
            this.progressReporter.options.total = files.length + 4; // files + 4 generation steps
            
            const schemaMap = await this.schemaProcessor.processFiles(files);
            
            if (schemaMap.size === 0) {
                console.log("No types found to generate schemas for");
                return;
            }
            
            // Validate schema compatibility
            this.progressReporter.update(files.length + 1, "Validating schema compatibility...");
            this.schemaProcessor.validateSchemaCompatibility(schemaMap);
            
            // Merge and write JSON schema
            this.progressReporter.update(files.length + 2, "Writing JSON schema...");
            const mergedSchema = this.schemaProcessor.mergeSchemas(schemaMap);
            await this.schemaWriter.writeJsonSchema(mergedSchema, this.jsonSchemaOutputFile);
            
            if (helpers === false) {
                this.progressReporter.complete("Schema generation completed (helpers skipped)");
                return;
            }
            
            // Generate TypeScript helpers
            this.progressReporter.update(files.length + 3, "Generating TypeScript helpers...");
            await Promise.all([
                this.codeGenerator.generateSchemaDefinition(schemaMap, this.tsSchemaDefinitionOutputFile),
                this.codeGenerator.generateValidatorFunction(this.isValidSchemaOutputFile),
                this.codeGenerator.generateValidationTypes(schemaMap, this.validationTypesOutputFile)
            ]);
            
            this.progressReporter.complete("Schema generation completed successfully");
            
        } catch (error) {
            const formattedError = formatError(error, this.options.verbose || false);
            console.error(`Schema generation failed: ${formattedError}`);
            
            if (!isKnownError(error) && this.options.verbose) {
                console.error(error);
            }
            
            throw error;
        }
    };

    public clearCache(): void {
        this.fileDiscovery.clearCache();
    }
    
    public async cleanOutput(): Promise<void> {
        await this.schemaWriter.cleanOutputDirectory();
    }
}
