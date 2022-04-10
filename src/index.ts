#!/usr/bin/env node

import { SchemaGenerator } from "./SchemaGenerator";
import { program } from "commander";

export interface ICommandOptions {
    readonly glob: string;
    readonly rootPath: string;
    readonly output: string;
}

program.option("--glob", "Glob file path of typescript files to generate ts-interface -> json-schema validations for.", "*");
program.option("--rootPath", "RootPath to search", "./src");
program.option("--output", "Validation schema + typescript interface output directory", "./.ts-runtime-check");

program.parse();

const options = program.opts<ICommandOptions>();
new SchemaGenerator(options);
