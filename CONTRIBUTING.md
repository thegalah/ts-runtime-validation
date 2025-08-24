# Contributing to ts-runtime-validation

Thank you for your interest in contributing to ts-runtime-validation! This guide will help you understand the project architecture and how to contribute effectively.

## Table of Contents

- [Project Architecture](#project-architecture)
- [Development Setup](#development-setup)
- [Code Structure](#code-structure)
- [Testing](#testing)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)

## Project Architecture

### Overview

ts-runtime-validation is a TypeScript-first tool that generates JSON Schema validators from TypeScript interfaces and type aliases. The architecture follows a service-oriented pipeline approach:

```
TypeScript Files → FileDiscovery → SchemaProcessor → CodeGenerator → Output Files
                                                   ↓
                      SchemaWriter ← Orchestrated by SchemaGenerator
```

### Core Components

#### 1. CLI Entry Point (`src/index.ts`)

- **Purpose**: Command-line interface entry point
- **Responsibilities**:
    - Parses command-line arguments using Commander.js
    - Instantiates SchemaGenerator with user options
    - Triggers the generation process

#### 2. Library Entry Point (`src/lib.ts`)

- **Purpose**: Programmatic API for library consumers
- **Exports**: SchemaGenerator class and ICommandOptions interface
- **Usage**: Allows integration into build tools and custom scripts

#### 3. Schema Generator (`src/SchemaGenerator.ts`)

- **Purpose**: Core orchestrator that coordinates all services
- **Architecture**: Uses dependency injection pattern with specialized services
- **Key Methods**:
    - `Generate()`: Main entry point with comprehensive error handling
    - `clearCache()`: Clears file cache for fresh builds
    - `cleanOutput()`: Removes previously generated files
- **Services Used**:
    - FileDiscovery: File system operations and caching
    - SchemaProcessor: TypeScript to JSON Schema conversion
    - CodeGenerator: TypeScript helper file generation
    - SchemaWriter: File writing operations
    - ProgressReporter: User feedback and progress tracking

#### 4. Command Options (`src/ICommandOptions.ts`)

- **Purpose**: Comprehensive configuration interface for all features
- **Core Fields**:
    - `glob`: Pattern for finding schema files
    - `rootPath`: Source directory root
    - `output`: Output directory for generated files
    - `helpers`: Whether to generate TypeScript helpers
    - `additionalProperties`: JSON Schema validation strictness
    - `tsconfigPath`: Custom TypeScript configuration
- **Performance Fields**:
    - `verbose`: Enable detailed logging
    - `progress`: Show progress indicators
    - `parallel`: Enable parallel file processing (default: true)
    - `cache`: Enable incremental builds with caching
- **Output Optimization Fields**:
    - `minify`: Minify generated output
    - `treeShaking`: Generate tree-shaking friendly exports
    - `lazyLoad`: Generate lazy-loaded validators

#### 5. Service Layer (`src/services/`)

- **FileDiscovery.ts**: File system operations, glob matching, caching
- **SchemaProcessor.ts**: TypeScript AST processing, parallel schema generation
- **CodeGenerator.ts**: TypeScript file generation with optimization options
- **SchemaWriter.ts**: File writing operations with output management

#### 6. Error Handling (`src/errors/`)

- **Custom Error Classes**: Specific error types for different failure scenarios
- **Error Formatting**: User-friendly error messages with context
- **Error Recovery**: Partial generation on non-critical errors

#### 7. Utility Functions

- `getPosixPath.ts`: Cross-platform path compatibility
- `writeLine.ts`: Console output utilities (legacy)
- `utils/ProgressReporter.ts`: Progress tracking and user feedback

### Dependencies

#### Core Dependencies

- **ts-json-schema-generator**: Converts TypeScript AST to JSON Schema
- **ts-morph**: TypeScript AST manipulation for generating helper files
- **commander**: CLI argument parsing
- **fdir**: Fast file system traversal
- **picomatch**: Glob pattern matching

#### Peer Dependencies

- **ajv**: Runtime JSON Schema validation (required by generated code)

### Generated Files

The tool generates four main files in the output directory:

1. **validation.schema.json**
    - Contains all JSON Schema definitions
    - Single source of truth for validation rules
    - Structure: `{ "$schema": "...", "definitions": { ... } }`

2. **SchemaDefinition.ts**
    - TypeScript interface mapping schema paths to types
    - Exports `ISchema` interface and `schemas` constant
    - Enables type-safe schema references

3. **isValidSchema.ts**
    - Runtime validation function with type guards
    - Integrates with AJV for actual validation
    - Provides type narrowing: `data is ISchema[T]`

4. **ValidationType.ts**
    - Namespace containing all validated types
    - Re-exports types from source files
    - Provides centralized type access

## Development Setup

### Prerequisites

- Node.js >= 12
- Yarn or npm
- TypeScript >= 4.0

### Installation

```bash
# Clone the repository
git clone https://github.com/thegalah/ts-runtime-validation.git
cd ts-runtime-validation

# Install dependencies
yarn install

# Build the project
yarn build

# Run tests
yarn test

# Link for local development
yarn link
```

### Development Workflow

1. Make changes to source files in `src/`
2. Run `yarn build` to compile TypeScript
3. Run `yarn test` to ensure tests pass
4. Test your changes locally using `yarn link`

## Testing

### Test Structure

Tests are located in `src/SchemaGenerator.test.ts` and use Jest as the testing framework.

### Test Scenarios

1. **Basic Scenario**: Validates simple interface generation
2. **Duplicate Symbols (Different)**: Ensures error on conflicting definitions
3. **Duplicate Symbols (Identical)**: Allows identical definitions across files

### Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test --watch

# Run tests with coverage
yarn test --coverage
```

### Writing Tests

When adding new features:

1. Create a test scenario in `src/test/`
2. Add test cases to `SchemaGenerator.test.ts`
3. Ensure both positive and negative cases are covered

## Making Changes

### Adding Features

1. **Identify the component** affected (CLI, SchemaGenerator, output files)
2. **Update interfaces** if adding new options
3. **Implement the feature** following existing patterns
4. **Add tests** for the new functionality
5. **Update documentation** (README.md and inline comments)

### Common Modification Points

#### Adding a new CLI option:

1. Update `ICommandOptions.ts` with the new field
2. Add the option in `index.ts` using Commander
3. Handle the option in the relevant service (FileDiscovery, SchemaProcessor, CodeGenerator, etc.)
4. Update the SchemaGenerator constructor to pass the option to the service
5. Update README.md with usage information and examples

#### Modifying generated output:

1. Identify which service handles the output (CodeGenerator or SchemaWriter)
2. Modify the appropriate service method
3. Update the service interface if new options are needed
4. Test with different configuration options (minify, treeShaking, lazyLoad)
5. Ensure backward compatibility

#### Supporting new TypeScript features:

1. Check ts-json-schema-generator compatibility
2. Update SchemaProcessor if custom handling is needed
3. Add test cases for the new feature in multiple scenarios
4. Handle edge cases in schema validation and deduplication
5. Update error handling for new failure modes

### Code Patterns to Follow

#### Service Integration

```typescript
// Use services instead of direct implementation
class MyNewService {
    constructor(private options: MyServiceOptions) {}

    async processData(): Promise<Result> {
        try {
            // Implementation
        } catch (error) {
            throw new CustomError(`Processing failed: ${error.message}`);
        }
    }
}

// Integrate with SchemaGenerator
this.myService = new MyNewService({
    option1: options.option1,
    option2: options.option2,
});
```

#### File System Operations

```typescript
// Use FileDiscovery service for file operations
const files = await this.fileDiscovery.discoverFiles();

// Use SchemaWriter for output operations
await this.schemaWriter.writeJsonSchema(schema, outputFile);

// Always use path utilities
const posixPath = getPosixPath(rawPath);
```

#### AST Manipulation

```typescript
// Use CodeGenerator service for TypeScript generation
await this.codeGenerator.generateSchemaDefinition(schemaMap, outputFile);

// For custom AST manipulation
const project = new Project(defaultTsMorphProjectSettings);
const sourceFile = project.createSourceFile(filePath, {}, { overwrite: true });

// Follow existing patterns for imports and structure
sourceFile.addImportDeclaration({
    namedImports: ["Type"],
    moduleSpecifier: getPosixPath("./module"),
});
```

#### Error Handling

```typescript
// Use custom error classes
throw new FileDiscoveryError(`No files found matching: ${glob}`, rootPath);

// Provide context with errors
throw new DuplicateSymbolError(`Symbol '${symbol}' defined differently`, symbol, filePath, existingDef, newDef);

// Format errors consistently
const message = formatError(error, verbose);
console.error(message);

// Handle errors gracefully
try {
    await this.processFiles(files);
} catch (error) {
    if (isKnownError(error)) {
        // Handle known errors
    } else {
        // Handle unexpected errors
    }
}
```

## Pull Request Process

### Before Submitting

1. **Fork the repository** and create a feature branch
2. **Write tests** for your changes
3. **Run the test suite** to ensure nothing is broken
4. **Format your code** using Prettier: `yarn prettier`
5. **Update documentation** if needed

### PR Guidelines

1. **Title**: Use a clear, descriptive title
2. **Description**: Explain what changes you made and why
3. **Breaking Changes**: Clearly mark if your change breaks existing functionality
4. **Tests**: Include test results or screenshots if applicable
5. **Issues**: Reference any related issues

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged

## Code Style

### TypeScript Guidelines

- Use TypeScript strict mode
- Prefer `readonly` for immutable properties
- Use interfaces for object shapes, type aliases for unions/primitives
- Avoid `any` type; use `unknown` if type is truly unknown

### Formatting

The project uses Prettier for consistent formatting:

```bash
# Format all files
yarn prettier

# Check formatting without changing files
yarn prettier --check
```

### Naming Conventions

- **Files**: camelCase for `.ts` files, PascalCase for React components
- **Interfaces**: Prefix with `I` (e.g., `ICommandOptions`)
- **Types**: PascalCase without prefix (e.g., `UserRole`)
- **Functions**: camelCase (e.g., `generateSchema`)
- **Constants**: UPPER_SNAKE_CASE for true constants, camelCase for configuration

### Comments and Documentation

- Use JSDoc for public APIs
- Include inline comments for complex logic
- Keep comments up-to-date with code changes

## Debugging Tips

### Local Testing

```bash
# Link the package locally
yarn link

# In another project
yarn link ts-runtime-validation

# Test the CLI
ts-runtime-validation --glob "*.types.ts" --rootPath ./src
```

### Common Issues

1. **Path resolution issues**: Check Windows vs POSIX paths (use `getPosixPath`)
2. **Duplicate symbols**: Check error details in verbose mode for conflicting definitions
3. **Missing dependencies**: Verify peer dependencies are installed
4. **Performance issues**: Enable caching and check parallel processing settings
5. **Memory issues**: Use lazy loading for large projects
6. **Cache corruption**: Clear cache with `generator.clearCache()` if builds seem stale

### Debug Output

Use the verbose flag and progress reporting:

```typescript
// Enable verbose logging in options
const options = { ...otherOptions, verbose: true, progress: true };

// Use progress reporter for user feedback
this.progressReporter.start("Starting operation...");
this.progressReporter.update(1, "Processing files...");
this.progressReporter.complete("Operation completed");

// Log detailed information in verbose mode
if (this.options.verbose) {
    console.log(`Processing file: ${file.path}`);
    console.log(`Cache hit: ${!this.fileDiscovery.hasFileChanged(file.path, file.hash)}`);
}
```

## Getting Help

- **Issues**: Open an issue on GitHub for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Documentation**: Check the README and inline code comments

## License

By contributing to ts-runtime-validation, you agree that your contributions will be licensed under the MIT License.
