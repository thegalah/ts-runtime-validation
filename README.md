# ts-runtime-validation

[![npm version](https://badge.fury.io/js/ts-runtime-validation.svg)](https://www.npmjs.com/package/ts-runtime-validation)

Generate bulletproof runtime type validation from your TypeScript interfaces and type aliases. No manual schema writing, no decorators, just your existing TypeScript types.

## ✨ Features

### Core Features
- 🚀 **Zero-effort validation** - Automatically generates JSON Schema validators from TypeScript interfaces
- 🔒 **Type-safe** - Full TypeScript support with type inference and type guards
- 📦 **Lightweight** - Minimal dependencies, can be installed as a dev dependency
- 🛠️ **CLI & Programmatic API** - Use as a CLI tool or integrate into your build process
- 🎯 **Selective generation** - Control which types to validate using file naming conventions
- 📝 **JSDoc annotations** - Add validation rules (min/max length, patterns, formats) directly in your TypeScript code

### Performance & Optimization
- ⚡ **Incremental builds** - File-based caching for faster subsequent builds
- 🔄 **Parallel processing** - Concurrent file processing for improved performance
- 📊 **Progress reporting** - Visual feedback for long-running operations
- 🌳 **Tree-shaking friendly** - Generate optimized exports for smaller bundles
- 💤 **Lazy loading** - Optional deferred validator initialization
- 📦 **Minified output** - Compressed JSON schemas for production
- 🔧 **Verbose logging** - Detailed debugging information when needed

## 📋 Prerequisites

- Node.js >= 12
- TypeScript >= 4.0
- `ajv` >= 8.11.0 (peer dependency for runtime validation)

## 📦 Installation

```bash
# Using yarn (recommended)
yarn add --dev ts-runtime-validation
yarn add ajv  # Required peer dependency

# Using npm
npm install --save-dev ts-runtime-validation
npm install ajv  # Required peer dependency
```

## 🚀 Quick Start

### 1. Mark your types for validation

Create files ending with `.jsonschema.ts` for types you want to validate:

```typescript
// user.jsonschema.ts
export interface IUser {
    id: string;
    email: string;
    name?: string;
    age: number;
    roles: string[];
}

export type UserRole = "admin" | "user" | "guest";
```

#### JSDoc Annotations for Validation Rules

You can add validation constraints using JSDoc annotations that will be converted to JSON Schema properties:

```typescript
// api.jsonschema.ts
export interface IGetUserFormsPathParams {
    /**
     * User ID to get forms for
     * @minLength 24
     * @maxLength 24
     * @pattern ^[a-fA-F0-9]{24}$
     */
    readonly userId: string;
}

export interface IProduct {
    /**
     * Product name
     * @minLength 1
     * @maxLength 100
     */
    name: string;

    /**
     * Product price in cents
     * @minimum 0
     * @maximum 1000000
     * @multipleOf 1
     */
    price: number;

    /**
     * Product tags
     * @minItems 1
     * @maxItems 10
     * @uniqueItems true
     */
    tags: string[];

    /**
     * Email for support
     * @format email
     */
    supportEmail?: string;

    /**
     * Product website
     * @format uri
     * @pattern ^https://
     */
    website?: string;
}
```

Supported JSDoc annotations include:

- **Strings**: `@minLength`, `@maxLength`, `@pattern`, `@format` (email, uri, uuid, date-time, etc.)
- **Numbers**: `@minimum`, `@maximum`, `@exclusiveMinimum`, `@exclusiveMaximum`, `@multipleOf`
- **Arrays**: `@minItems`, `@maxItems`, `@uniqueItems`
- **Objects**: `@minProperties`, `@maxProperties`
- **General**: `@description`, `@default`, `@examples`

### 2. Add to your package.json scripts

```json
{ "scripts": { "generate-types": "ts-runtime-validation" } }
```

### 3. Generate validators

```bash
yarn generate-types
```

### 4. Use the generated validators

```typescript
import { isValidSchema } from "./.ts-runtime-validation/isValidSchema";
import { IUser } from "./user.jsonschema";

const userData = await fetch("/api/user").then((r) => r.json());

if (isValidSchema(userData, "#/definitions/IUser")) {
    // userData is now typed as IUser
    console.log(userData.email); // TypeScript knows this is a string
} else {
    console.error("Invalid user data received");
}
```

## 📖 Usage

### CLI Options

```bash
ts-runtime-validation [options]

Core Options:
  --glob <pattern>               Glob pattern for schema files
                                (default: "*.jsonschema.{ts,tsx}")
  --rootPath <rootFolder>        Source directory root
                                (default: "./src")
  --output <outputFolder>        Output directory for generated files
                                (default: "./.ts-runtime-validation")
  --tsconfigPath <path>          Path to tsconfig.json
                                (default: "")
  --generate-helpers             Generate TypeScript helper files
                                (default: true)
  --additionalProperties         Allow additional properties in validation
                                (default: false)

Performance Options:
  --cache                        Enable file caching for incremental builds
  --no-parallel                  Disable parallel processing (enabled by default)
  --verbose                      Enable detailed logging and debugging info
  --progress                     Show progress bars and status updates

Output Optimization:
  --minify                       Minify generated JSON schemas
  --tree-shaking                 Generate tree-shaking friendly exports
  --lazy-load                    Generate lazy-loaded validators
  
General:
  -h, --help                     Display help information
```

### Generated Files

The tool generates optimized files in your output directory:

| File                     | Description                                           | Optimizations                    |
| ------------------------ | ----------------------------------------------------- | -------------------------------- |
| `validation.schema.json` | JSON Schema definitions for all your types           | Minification with `--minify`     |
| `SchemaDefinition.ts`    | TypeScript interface mapping schema paths to types   | Tree-shaking ready imports       |
| `isValidSchema.ts`       | Type guard helper with runtime validation            | Lazy loading with `--lazy-load`  |
| `ValidationType.ts`      | Centralized type exports                             | Individual exports or namespace   |

### Programmatic API

```typescript
import { SchemaGenerator } from "ts-runtime-validation";

// Basic usage
const generator = new SchemaGenerator({
    glob: "**/*.jsonschema.ts",
    rootPath: "./src",
    output: "./validation",
    helpers: true,
    additionalProperties: false,
    tsconfigPath: ""
});

await generator.Generate();

// Development configuration (fast iterations)
const devGenerator = new SchemaGenerator({
    glob: "**/*.jsonschema.ts",
    rootPath: "./src",
    output: "./.ts-runtime-validation",
    helpers: true,
    additionalProperties: false,
    tsconfigPath: "",
    // Development optimizations
    cache: true,          // Enable incremental builds
    progress: true,       // Show progress feedback
    verbose: true,        // Detailed logging
    parallel: true        // Faster processing
});

// Production configuration (optimized output)
const prodGenerator = new SchemaGenerator({
    glob: "**/*.jsonschema.ts",
    rootPath: "./src",
    output: "./dist/validation",
    helpers: true,
    additionalProperties: false,
    tsconfigPath: "./tsconfig.json",
    // Production optimizations
    cache: true,          // Faster builds
    minify: true,         // Smaller output files
    treeShaking: true,    // Bundle optimization
    lazyLoad: false,      // Eager loading for performance
    parallel: true        // Maximum speed
});

// Large project configuration (memory efficient)
const largeProjectGenerator = new SchemaGenerator({
    glob: "**/*.jsonschema.ts",
    rootPath: "./src",
    output: "./validation",
    helpers: true,
    additionalProperties: false,
    tsconfigPath: "",
    // Large project optimizations  
    cache: true,          // Essential for large projects
    progress: true,       // Track long operations
    lazyLoad: true,       // Reduce initial memory usage
    treeShaking: true,    // Optimize bundle size
    minify: true          // Reduce file size
});

// Execute generation
try {
    await generator.Generate();
    console.log('Schema generation completed successfully!');
} catch (error) {
    console.error('Generation failed:', error.message);
}

// Utility methods
generator.clearCache();           // Clear file cache
await generator.cleanOutput();    // Remove generated files
```

### Watch Mode & Development Workflows

```json
{
    "scripts": {
        "generate-types": "ts-runtime-validation --cache --progress",
        "generate-types:watch": "nodemon --watch 'src/**/*.jsonschema.ts' --exec 'yarn generate-types'",
        "generate-types:dev": "ts-runtime-validation --cache --verbose --progress",
        "generate-types:prod": "ts-runtime-validation --cache --minify --tree-shaking",
        "generate-types:clean": "rimraf .ts-runtime-validation-cache && yarn generate-types"
    }
}
```

### Custom File Patterns

```bash
# Basic usage
ts-runtime-validation

# Custom file patterns
ts-runtime-validation --glob "**/*.types.ts"
ts-runtime-validation --glob "**/*.{types,schemas}.ts"

# Development workflow (fast iterations)
ts-runtime-validation --cache --progress --verbose

# Production build (optimized output)
ts-runtime-validation --cache --minify --tree-shaking

# Large projects (performance focused)
ts-runtime-validation --cache --progress --lazy-load

# Specific directories
ts-runtime-validation --rootPath "./src/api" --output "./api-validation"

# CI/CD optimized
ts-runtime-validation --cache --minify --no-parallel

# Debug mode (maximum verbosity)
ts-runtime-validation --verbose --progress --no-parallel
```

## 🚀 Performance & Optimization

### Caching System

ts-runtime-validation includes an intelligent caching system for faster incremental builds:

```bash
# Enable caching (recommended for development)
ts-runtime-validation --cache
```

**How it works:**
- Generates MD5 hashes of source files to detect changes
- Stores cache in `.ts-runtime-validation-cache/`
- Only processes files that have been modified
- Provides significant speedup for large projects

### Performance Tips

**Development Workflow:**
```bash
# Fast iterations with caching and progress
ts-runtime-validation --cache --progress --verbose
```

**Production Builds:**
```bash
# Optimized output for deployment
ts-runtime-validation --cache --minify --tree-shaking
```

**Large Projects:**
```bash
# Memory efficient processing
ts-runtime-validation --cache --lazy-load --progress
```

### Bundle Optimization

**Tree-shaking friendly exports:**
```typescript
// With --tree-shaking flag
export type IUser = _IUser;      // Individual exports
export type IProduct = _IProduct;

// Default behavior
namespace ValidationType {       // Namespace exports
    export type IUser = _IUser;
}
```

**Lazy-loaded validators:**
```typescript
// With --lazy-load flag
let validator: any = null;
const getValidator = () => {
    if (!validator) {
        const Ajv = require("ajv");
        validator = new Ajv({ allErrors: true });
        validator.compile(schema);
    }
    return validator;
};
```

## ⚠️ Limitations

- **No duplicate type names** - Each interface/type must have a unique name across all schema files
- **TypeScript-only constructs** - Some advanced TypeScript features (like conditional types) may not be fully supported
- **Circular references** - Limited support for circular type references

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/thegalah/ts-runtime-validation.git
cd ts-runtime-validation

# Install dependencies
yarn install

# Build the project
yarn build

# Run comprehensive test suite (103+ tests)
yarn test

# Link for local development
yarn link
```

### Architecture

ts-runtime-validation uses a modern service-oriented architecture:

- **FileDiscovery**: File system operations and intelligent caching
- **SchemaProcessor**: TypeScript AST processing with parallel execution
- **CodeGenerator**: Optimized TypeScript file generation
- **SchemaWriter**: Efficient file writing with minification
- **ProgressReporter**: User-friendly progress tracking

### Contributing Guidelines

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed information about:
- Service-oriented architecture patterns
- Error handling strategies
- Performance optimization techniques
- Testing approaches and best practices

## 🙏 Acknowledgments

Built with modern tools and optimized for performance:

- [ts-json-schema-generator](https://github.com/vega/ts-json-schema-generator) - TypeScript to JSON Schema conversion
- [ajv](https://github.com/ajv-validator/ajv) - Runtime JSON Schema validation
- [ts-morph](https://github.com/dsherret/ts-morph) - TypeScript AST manipulation and code generation
- [fdir](https://github.com/thecodrr/fdir) - Fast file system traversal
- [picomatch](https://github.com/micromatch/picomatch) - Efficient glob pattern matching

## 📚 Related Projects & Comparisons

### How ts-runtime-validation differs from alternatives:

| Library                                      | Approach                                                                    | When to Use                                                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **ts-runtime-validation**                    | Generates validators from existing TypeScript interfaces via CLI/build step | You already have TypeScript interfaces and want automatic validation without runtime dependencies or API changes |
| **[zod](https://github.com/colinhacks/zod)** | Define schemas in code that create both types and validators                | You want to define your schema once and derive TypeScript types from it, with a runtime validation library       |
| **[io-ts](https://github.com/gcanti/io-ts)** | Functional programming approach with codecs for encoding/decoding           | You need bidirectional transformations and prefer functional programming patterns                                |
| **[yup](https://github.com/jquense/yup)**    | Runtime schema builder with fluent API                                      | You're working with forms/frontend validation and want a battle-tested solution with built-in error messages     |

### Key Differences:

**ts-runtime-validation**:

- ✅ **Zero runtime API** - Works with your existing TypeScript interfaces
- ✅ **Build-time generation** - No runtime overhead for schema creation
- ✅ **JSDoc validation rules** - Add constraints via comments
- ✅ **Intelligent caching** - Fast incremental builds with change detection
- ✅ **Performance optimized** - Parallel processing and bundle optimization
- ❌ **Requires build step** - Must regenerate when types change
- ❌ **No runtime schema composition** - Can't dynamically create schemas

**zod/io-ts/yup**:

- ✅ **Runtime flexibility** - Create and compose schemas dynamically
- ✅ **Single source of truth** - Schema and type defined together
- ✅ **No build step** - Works immediately in your code
- ❌ **Runtime overhead** - Schemas created at runtime
- ❌ **Duplicate type definitions** - Can't reuse existing TypeScript interfaces

Choose **ts-runtime-validation** when you:

- Have existing TypeScript interfaces you want to validate
- Prefer build-time code generation over runtime libraries
- Want to keep validation rules close to your type definitions via JSDoc
- Need minimal runtime dependencies
- Require high performance with caching and parallel processing
- Want bundle optimization (tree-shaking, lazy loading)
- Need incremental builds for large projects

Choose **alternatives** when you:

- Want to define schemas at runtime dynamically
- Prefer schema-first design (define validation, derive types)
- Need complex runtime transformations or coercions
- Want extensive built-in validation methods and error messages
