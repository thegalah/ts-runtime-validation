#!/usr/bin/env node

import { SchemaGenerator } from "./SchemaGenerator";
import { program } from "commander";

const defaultRootPath = "./src";
const defaultOutputFolder = "./.ts-runtime-check";

export interface ICommandOptions {
    readonly glob: string;
    readonly rootPath: string;
    readonly output: string;
}

program.option(
    "--glob",
    "Glob file path of typescript files to generate ts-interface -> json-schema validations for.",
    "*.jsonschema.{ts,tsx}"
);
program.option("--rootPath", `RootPath of source - default: ${defaultRootPath}`, defaultRootPath);
program.option(
    "--output",
    `Validation schema + typescript interface output directory (relative to root path) - default: ${defaultOutputFolder}`,
    defaultOutputFolder
);

program.parse();

const options = program.opts<ICommandOptions>();
new SchemaGenerator(options);
