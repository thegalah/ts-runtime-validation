# ts-runtime-check

## Why?

Get bulletproof type validation based off typescript interfaces

## How?

This is a code generator that is designed to run as a yarn / npm script. By default scans your source directory for files ending in the provided glob pattern. By default: `*.jsonschema.{ts,tsx}`.

## Footnote

The helper file assumes you have [ajv-validator](https://github.com/ajv-validator/ajv) peer dependency installed.

## CLI usage

```
Usage: ts-runtime-check [options]

Options:
  --glob        Glob file path of typescript files to generate ts-interface -> json-schema validations - default: *.jsonschema.{ts,tsx}
  --rootPath    RootPath of source - default: ./src
  --output      Validation schema + typescript interface output directory (relative to root path) - default: ./.ts-runtime-check
  --no-helpers  Only generate JSON schema without typescript helper files
  -h, --help    display help for command
```

## Usage with helper function

```typescript
if (isValidSchema(data, "#/definitions/ITypeA")) {
    // variable: data in this block will have typings for ITypeA
}
```

## Contributing

Submit a PR

## License

MIT
