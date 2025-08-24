export class BaseError extends Error {
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class FileDiscoveryError extends BaseError {
    constructor(message: string, public readonly path?: string) {
        super(message, 'FILE_DISCOVERY_ERROR');
    }
}

export class SchemaGenerationError extends BaseError {
    constructor(message: string, public readonly file?: string) {
        super(message, 'SCHEMA_GENERATION_ERROR');
    }
}

export class DuplicateSymbolError extends BaseError {
    constructor(
        message: string,
        public readonly symbol: string,
        public readonly file: string,
        public readonly existingDefinition: any,
        public readonly newDefinition: any
    ) {
        super(message, 'DUPLICATE_SYMBOL_ERROR');
    }

    getDetailedMessage(): string {
        return `${this.message}
Symbol: ${this.symbol}
File: ${this.file}
Existing Definition: ${JSON.stringify(this.existingDefinition, null, 2)}
New Definition: ${JSON.stringify(this.newDefinition, null, 2)}`;
    }
}

export class CodeGenerationError extends BaseError {
    constructor(message: string, public readonly outputFile?: string) {
        super(message, 'CODE_GENERATION_ERROR');
    }
}

export class ValidationError extends BaseError {
    constructor(
        message: string,
        public readonly errors: Array<{ path: string; message: string }>
    ) {
        super(message, 'VALIDATION_ERROR');
    }

    getDetailedMessage(): string {
        const errorList = this.errors
            .map(err => `  - ${err.path}: ${err.message}`)
            .join('\n');
        return `${this.message}\n${errorList}`;
    }
}

export class ConfigurationError extends BaseError {
    constructor(message: string, public readonly field?: string) {
        super(message, 'CONFIGURATION_ERROR');
    }
}

export class CacheError extends BaseError {
    constructor(message: string, public readonly operation?: string) {
        super(message, 'CACHE_ERROR');
    }
}

export function isKnownError(error: unknown): error is BaseError {
    return error instanceof BaseError;
}

export function formatError(error: unknown, verbose: boolean = false): string {
    if (isKnownError(error)) {
        if (verbose && 'getDetailedMessage' in error) {
            return (error as any).getDetailedMessage();
        }
        return `[${error.code}] ${error.message}`;
    }
    
    if (error instanceof Error) {
        return verbose ? error.stack || error.message : error.message;
    }
    
    return String(error);
}