# ts-runtime-validation

[![npm version](https://badge.fury.io/js/ts-runtime-validation.svg)](https://www.npmjs.com/package/ts-runtime-validation)

Generate bulletproof runtime type validation from your TypeScript interfaces and type aliases. No manual schema writing, no decorators, just your existing TypeScript types.

## ✨ Features

- 🚀 **Zero-effort validation** - Automatically generates JSON Schema validators from TypeScript interfaces
- 🔒 **Type-safe** - Full TypeScript support with type inference and type guards
- 📦 **Lightweight** - Minimal dependencies, can be installed as a dev dependency
- 🛠️ **CLI & Programmatic API** - Use as a CLI tool or integrate into your build process
- 🎯 **Selective generation** - Control which types to validate using file naming conventions
- 📝 **JSDoc annotations** - Add validation rules (min/max length, patterns, formats) directly in your TypeScript code

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

Options:
  --glob                         Glob pattern for schema files
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
  --verbose                      Enable verbose logging
  --progress                     Show progress information
  --cache                        Enable file caching for incremental builds
  --no-parallel                  Disable parallel processing

Output Options:
  --minify                       Minify generated output
  --tree-shaking                 Generate tree-shaking friendly exports
  --lazy-load                    Generate lazy-loaded validators
  -h, --help                     Display help
```

### Generated Files

The tool generates four files in your output directory:

| File                     | Description                                    |
| ------------------------ | ---------------------------------------------- |
| `validation.schema.json` | JSON Schema definitions for all your types     |
| `SchemaDefinition.ts`    | TypeScript type definitions                    |
| `isValidSchema.ts`       | Type guard helper function with type inference |
| `ValidationType.ts`      | Namespace containing all validation types      |

### Programmatic API

```typescript
import { SchemaGenerator } from "ts-runtime-validation";

// Basic usage
const generator = new SchemaGenerator({
    glob: "**/*.types.ts",
    rootPath: "./src",
    output: "./validation",
    additionalProperties: false,
    helpers: true,
    tsconfigPath: ""
});

await generator.Generate();

// Advanced usage with performance options
const optimizedGenerator = new SchemaGenerator({
    glob: "**/*.jsonschema.ts",
    rootPath: "./src",
    output: "./dist/validation",
    additionalProperties: false,
    helpers: true,
    tsconfigPath: "",
    // Performance options
    verbose: true,
    progress: true,
    cache: true,
    parallel: true,
    // Output optimization
    minify: true,
    treeShaking: true,
    lazyLoad: false
});

await optimizedGenerator.Generate();

// Utility methods
optimizedGenerator.clearCache(); // Clear file cache
await optimizedGenerator.cleanOutput(); // Remove generated files
```

### Watch Mode with nodemon

```json
{
    "scripts": {
        "generate-types": "ts-runtime-validation",
        "generate-types:watch": "nodemon --watch 'src/**/*.jsonschema.ts' --exec 'yarn generate-types'"
    }
}
```

### Custom File Patterns

```bash
# Validate all .types.ts files
ts-runtime-validation --glob "**/*.types.ts"

# Multiple patterns
ts-runtime-validation --glob "**/*.{types,schemas}.ts"

# Specific directories
ts-runtime-validation --rootPath "./src/api" --output "./src/api/validation"

# Performance optimized build
ts-runtime-validation --cache --progress --parallel

# Production build with optimizations
ts-runtime-validation --minify --tree-shaking --cache

# Development with detailed feedback
ts-runtime-validation --verbose --progress

# Lazy loading for large projects
ts-runtime-validation --lazy-load --tree-shaking
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

# Run tests
yarn test

# Link for local development
yarn link
```

## 🙏 Acknowledgments

Built with:

- [ts-json-schema-generator](https://github.com/vega/ts-json-schema-generator) - For TypeScript to JSON Schema conversion
- [ajv](https://github.com/ajv-validator/ajv) - For JSON Schema validation
- [ts-morph](https://github.com/dsherret/ts-morph) - For TypeScript AST manipulation

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

Choose **alternatives** when you:

- Want to define schemas at runtime dynamically
- Prefer schema-first design (define validation, derive types)
- Need complex runtime transformations or coercions
- Want extensive built-in validation methods and error messages
