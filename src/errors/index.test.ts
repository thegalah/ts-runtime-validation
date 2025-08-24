import {
    BaseError,
    FileDiscoveryError,
    SchemaGenerationError,
    DuplicateSymbolError,
    CodeGenerationError,
    ValidationError,
    ConfigurationError,
    CacheError,
    isKnownError,
    formatError
} from "./index";

describe("Error Classes", () => {
    describe("BaseError", () => {
        it("should create error with message and code", () => {
            const error = new BaseError("Test message", "TEST_CODE");
            
            expect(error.message).toBe("Test message");
            expect(error.code).toBe("TEST_CODE");
            expect(error.name).toBe("BaseError");
            expect(error instanceof Error).toBe(true);
        });

        it("should capture stack trace", () => {
            const error = new BaseError("Test", "CODE");
            expect(error.stack).toBeDefined();
            expect(error.stack).toContain("BaseError");
        });
    });

    describe("FileDiscoveryError", () => {
        it("should create error with path information", () => {
            const error = new FileDiscoveryError("File not found", "/path/to/file");
            
            expect(error.message).toBe("File not found");
            expect(error.code).toBe("FILE_DISCOVERY_ERROR");
            expect(error.path).toBe("/path/to/file");
            expect(error.name).toBe("FileDiscoveryError");
        });

        it("should work without path", () => {
            const error = new FileDiscoveryError("General error");
            
            expect(error.message).toBe("General error");
            expect(error.path).toBeUndefined();
        });
    });

    describe("SchemaGenerationError", () => {
        it("should create error with file information", () => {
            const error = new SchemaGenerationError("Schema generation failed", "user.ts");
            
            expect(error.message).toBe("Schema generation failed");
            expect(error.code).toBe("SCHEMA_GENERATION_ERROR");
            expect(error.file).toBe("user.ts");
        });

        it("should work without file", () => {
            const error = new SchemaGenerationError("General schema error");
            
            expect(error.message).toBe("General schema error");
            expect(error.file).toBeUndefined();
        });
    });

    describe("DuplicateSymbolError", () => {
        it("should create error with symbol details", () => {
            const existingDef = { type: "object", properties: { id: { type: "string" } } };
            const newDef = { type: "object", properties: { id: { type: "number" } } };
            
            const error = new DuplicateSymbolError(
                "Duplicate symbol found",
                "IUser",
                "user2.ts",
                existingDef,
                newDef
            );
            
            expect(error.message).toBe("Duplicate symbol found");
            expect(error.code).toBe("DUPLICATE_SYMBOL_ERROR");
            expect(error.symbol).toBe("IUser");
            expect(error.file).toBe("user2.ts");
            expect(error.existingDefinition).toBe(existingDef);
            expect(error.newDefinition).toBe(newDef);
        });

        it("should provide detailed message", () => {
            const existingDef = { type: "string" };
            const newDef = { type: "number" };
            
            const error = new DuplicateSymbolError(
                "Conflict",
                "TestType",
                "test.ts",
                existingDef,
                newDef
            );
            
            const detailed = error.getDetailedMessage();
            
            expect(detailed).toContain("Conflict");
            expect(detailed).toContain("Symbol: TestType");
            expect(detailed).toContain("File: test.ts");
            expect(detailed).toContain("Existing Definition:");
            expect(detailed).toContain("New Definition:");
            expect(detailed).toContain(JSON.stringify(existingDef, null, 2));
            expect(detailed).toContain(JSON.stringify(newDef, null, 2));
        });
    });

    describe("CodeGenerationError", () => {
        it("should create error with output file information", () => {
            const error = new CodeGenerationError("Generation failed", "output.ts");
            
            expect(error.message).toBe("Generation failed");
            expect(error.code).toBe("CODE_GENERATION_ERROR");
            expect(error.outputFile).toBe("output.ts");
        });

        it("should work without output file", () => {
            const error = new CodeGenerationError("General generation error");
            
            expect(error.message).toBe("General generation error");
            expect(error.outputFile).toBeUndefined();
        });
    });

    describe("ValidationError", () => {
        it("should create error with validation errors", () => {
            const validationErrors = [
                { path: "user.name", message: "Required field missing" },
                { path: "user.age", message: "Must be a number" }
            ];
            
            const error = new ValidationError("Validation failed", validationErrors);
            
            expect(error.message).toBe("Validation failed");
            expect(error.code).toBe("VALIDATION_ERROR");
            expect(error.errors).toBe(validationErrors);
        });

        it("should provide detailed message", () => {
            const validationErrors = [
                { path: "user.name", message: "Required" },
                { path: "user.email", message: "Invalid format" }
            ];
            
            const error = new ValidationError("Failed", validationErrors);
            const detailed = error.getDetailedMessage();
            
            expect(detailed).toContain("Failed");
            expect(detailed).toContain("user.name: Required");
            expect(detailed).toContain("user.email: Invalid format");
        });

        it("should handle empty errors array", () => {
            const error = new ValidationError("No specific errors", []);
            const detailed = error.getDetailedMessage();
            
            expect(detailed).toBe("No specific errors\n");
        });
    });

    describe("ConfigurationError", () => {
        it("should create error with field information", () => {
            const error = new ConfigurationError("Invalid configuration", "rootPath");
            
            expect(error.message).toBe("Invalid configuration");
            expect(error.code).toBe("CONFIGURATION_ERROR");
            expect(error.field).toBe("rootPath");
        });

        it("should work without field", () => {
            const error = new ConfigurationError("General config error");
            
            expect(error.message).toBe("General config error");
            expect(error.field).toBeUndefined();
        });
    });

    describe("CacheError", () => {
        it("should create error with operation information", () => {
            const error = new CacheError("Cache operation failed", "read");
            
            expect(error.message).toBe("Cache operation failed");
            expect(error.code).toBe("CACHE_ERROR");
            expect(error.operation).toBe("read");
        });

        it("should work without operation", () => {
            const error = new CacheError("General cache error");
            
            expect(error.message).toBe("General cache error");
            expect(error.operation).toBeUndefined();
        });
    });
});

describe("Error Utilities", () => {
    describe("isKnownError", () => {
        it("should return true for known errors", () => {
            expect(isKnownError(new FileDiscoveryError("test"))).toBe(true);
            expect(isKnownError(new SchemaGenerationError("test"))).toBe(true);
            expect(isKnownError(new DuplicateSymbolError("test", "sym", "file", {}, {}))).toBe(true);
            expect(isKnownError(new CodeGenerationError("test"))).toBe(true);
            expect(isKnownError(new ValidationError("test", []))).toBe(true);
            expect(isKnownError(new ConfigurationError("test"))).toBe(true);
            expect(isKnownError(new CacheError("test"))).toBe(true);
        });

        it("should return false for unknown errors", () => {
            expect(isKnownError(new Error("regular error"))).toBe(false);
            expect(isKnownError(new TypeError("type error"))).toBe(false);
            expect(isKnownError("string error")).toBe(false);
            expect(isKnownError(null)).toBe(false);
            expect(isKnownError(undefined)).toBe(false);
            expect(isKnownError({ message: "object error" })).toBe(false);
        });
    });

    describe("formatError", () => {
        it("should format known errors with code", () => {
            const error = new FileDiscoveryError("File not found");
            const formatted = formatError(error);
            
            expect(formatted).toBe("[FILE_DISCOVERY_ERROR] File not found");
        });

        it("should use detailed message in verbose mode", () => {
            const validationErrors = [
                { path: "user.name", message: "Required" }
            ];
            const error = new ValidationError("Validation failed", validationErrors);
            
            const formatted = formatError(error, true);
            
            expect(formatted).toContain("Validation failed");
            expect(formatted).toContain("user.name: Required");
        });

        it("should format regular errors", () => {
            const error = new Error("Regular error");
            
            expect(formatError(error, false)).toBe("Regular error");
            expect(formatError(error, true)).toContain("Regular error");
        });

        it("should include stack trace in verbose mode for regular errors", () => {
            const error = new Error("Test error");
            const formatted = formatError(error, true);
            
            expect(formatted).toContain("Error: Test error");
        });

        it("should handle errors without stack", () => {
            const error = new Error("No stack");
            error.stack = undefined;
            
            const formatted = formatError(error, true);
            expect(formatted).toBe("No stack");
        });

        it("should handle non-error objects", () => {
            expect(formatError("string error")).toBe("string error");
            expect(formatError(123)).toBe("123");
            expect(formatError(null)).toBe("null");
            expect(formatError(undefined)).toBe("undefined");
            expect(formatError({ message: "object" })).toBe("[object Object]");
        });

        it("should handle DuplicateSymbolError detailed message", () => {
            const error = new DuplicateSymbolError(
                "Duplicate found",
                "ITest",
                "test.ts",
                { type: "string" },
                { type: "number" }
            );
            
            const formatted = formatError(error, true);
            
            expect(formatted).toContain("Symbol: ITest");
            expect(formatted).toContain("File: test.ts");
        });

        it("should not use detailed message for errors without it", () => {
            const error = new FileDiscoveryError("Test error");
            const formatted = formatError(error, true);
            
            expect(formatted).toBe("[FILE_DISCOVERY_ERROR] Test error");
        });
    });

    describe("error inheritance", () => {
        it("should maintain proper instanceof relationships", () => {
            const fileError = new FileDiscoveryError("test");
            
            expect(fileError instanceof FileDiscoveryError).toBe(true);
            expect(fileError instanceof BaseError).toBe(true);
            expect(fileError instanceof Error).toBe(true);
        });

        it("should have correct constructor names", () => {
            const errors = [
                new FileDiscoveryError("test"),
                new SchemaGenerationError("test"),
                new CodeGenerationError("test"),
                new ValidationError("test", []),
                new ConfigurationError("test"),
                new CacheError("test")
            ];
            
            errors.forEach(error => {
                expect(error.constructor.name).toBe(error.name);
            });
        });
    });
});