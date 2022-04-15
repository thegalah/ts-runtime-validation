#!/usr/bin/env node

import { SchemaGenerator } from "./SchemaGenerator";
import { program } from "commander";

const defaultGlobPattern = "*.jsonschema.{ts,tsx}";

const defaultRootPath = "./src";
const defaultOutputFolder = "./.ts-runtime-validation";

export interface ICommandOptions {
    readonly glob: string;
    readonly rootPath: string;
    readonly output: string;
    readonly helpers: boolean;
}

program.option(
    "--glob",
    `Glob file path of typescript files to generate ts-interface -> json-schema validations - default: ${defaultGlobPattern}`,
    defaultGlobPattern
);
program.option("--rootPath", `RootPath of source - default: ${defaultRootPath}`, defaultRootPath);
program.option(
    "--output",
    `Validation schema + typescript interface output directory (relative to root path) - default: ${defaultOutputFolder}`,
    defaultOutputFolder
);
program.option("--no-helpers", "Only generate JSON schema without typescript helper files", true);

program.parse();

const options = program.opts<ICommandOptions>();

const generator = new SchemaGenerator(options);
generator.Generate();
