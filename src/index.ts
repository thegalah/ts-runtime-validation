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
    readonly additionalProperties: boolean;
}

program.option(
    "--glob",
    `Glob file path of typescript files to generate ts-interface -> json-schema validations - default: ${defaultGlobPattern}`,
    defaultGlobPattern
);
program.option("--rootPath <rootFolder>", `RootPath of source`, defaultRootPath);
program.option("--output <outputFolder>", `Code generation output directory (relative to root path)`, defaultOutputFolder);
program.option("--no-helpers", "Only generate JSON schema without typescript helper files", true);
program.option("--additionalProperties", "Allow additional properties to pass validation", false);

program.parse();

const options = program.opts<ICommandOptions>();

const generator = new SchemaGenerator(options);
generator.Generate();
