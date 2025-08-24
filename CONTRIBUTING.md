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

ts-runtime-validation is a TypeScript-first tool that generates JSON Schema validators from TypeScript interfaces and type aliases. The architecture follows a pipeline approach:

```
TypeScript Files → Parser → Schema Generator → JSON Schema + TypeScript Helpers
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

- **Purpose**: Core orchestrator of the validation generation pipeline
- **Key Methods**:
    - `Generate()`: Main entry point that coordinates the entire generation process
    - `getMatchingFiles()`: Finds TypeScript files matching the glob pattern
    - `getJsonSchemasForFiles()`: Converts TypeScript to JSON Schema using ts-json-schema-generator
    - `writeSchemaMapToValidationSchema()`: Writes the consolidated JSON Schema file
    - `writeSchemaMapToValidationTypes()`: Generates TypeScript type definitions
    - `writeValidatorFunction()`: Creates the runtime validation helper
    - `writeValidationTypes()`: Generates the ValidationType namespace

#### 4. Command Options (`src/ICommandOptions.ts`)

- **Purpose**: Type definitions for configuration options
- **Fields**:
    - `glob`: Pattern for finding schema files
    - `rootPath`: Source directory root
    - `output`: Output directory for generated files
    - `helpers`: Whether to generate TypeScript helpers
    - `additionalProperties`: JSON Schema validation strictness
    - `tsconfigPath`: Custom TypeScript configuration

#### 5. Utility Functions

- `getPosixPath.ts`: Ensures cross-platform path compatibility
- `writeLine.ts`: Console output utilities

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

## Code Structure

### Directory Layout

```
ts-runtime-validation/
├── src/
│   ├── index.ts                 # CLI entry point
│   ├── lib.ts                   # Library exports
│   ├── SchemaGenerator.ts       # Core generator logic
│   ├── SchemaGenerator.test.ts  # Generator tests
│   ├── ICommandOptions.ts       # Configuration types
│   ├── getPosixPath.ts          # Path utilities
│   ├── writeLine.ts             # Console utilities
│   └── test/                    # Test scenarios
│       ├── basic-scenario/
│       └── duplicate-symbols-*/
├── dist/                        # Compiled JavaScript
├── package.json
├── tsconfig.json               # TypeScript configuration
├── jest.config.js              # Test configuration
└── README.md
```

### Key Design Patterns

#### 1. Builder Pattern

The SchemaGenerator class uses a builder-like pattern where configuration is set via constructor and generation happens via the `Generate()` method.

#### 2. Pipeline Processing

Files are processed in stages:

1. File discovery
2. Schema extraction
3. Deduplication
4. File generation

#### 3. AST Manipulation

Uses ts-morph for generating TypeScript files programmatically, ensuring correct syntax and formatting.

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
3. Handle the option in `SchemaGenerator.ts`
4. Update README.md with usage information

#### Modifying generated output:

1. Locate the relevant `write*` method in SchemaGenerator
2. Use ts-morph for TypeScript generation
3. Ensure backward compatibility

#### Supporting new TypeScript features:

1. Check ts-json-schema-generator compatibility
2. Add test cases for the new feature
3. Handle edge cases in deduplication logic

### Code Patterns to Follow

#### File System Operations

```typescript
// Always use path.join or path.resolve for paths
const outputPath = path.join(this.options.rootPath, this.options.output);

// Check existence before operations
if (!fs.existsSync(this.outputPath)) {
    fs.mkdirSync(this.outputPath, { recursive: true });
}
```

#### AST Manipulation

```typescript
// Use ts-morph for generating TypeScript
const sourceFile = project.createSourceFile(
    filePath,
    {},
    {
        overwrite: true,
    }
);

sourceFile.addImportDeclaration({
    namedImports: ["Type"],
    moduleSpecifier: "./module",
});
```

#### Error Handling

```typescript
// Provide clear error messages
if (fileList.length === 0) {
    writeLine(`Aborting - no files found with glob: ${glob}`);
    return;
}

// Use assertions for validation
assert.deepEqual(definitions[key], defs[key]);
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
2. **Duplicate symbols**: Ensure unique type names across schema files
3. **Missing dependencies**: Verify peer dependencies are installed

### Debug Output

Add debug logging using the `writeLine` utility:

```typescript
import { writeLine } from "./writeLine";
writeLine(`Processing file: ${file}`);
```

## Getting Help

- **Issues**: Open an issue on GitHub for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Documentation**: Check the README and inline code comments

## License

By contributing to ts-runtime-validation, you agree that your contributions will be licensed under the MIT License.
