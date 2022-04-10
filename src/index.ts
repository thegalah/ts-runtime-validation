#!/usr/bin/env node
import { program } from "commander";

export interface ICommandOptions {
    readonly glob: string;
    readonly output: string;
}

program.option("--glob", "Glob file path of typescript files to generate ts-interface -> json-schema validations for.", "*");
program.option("--output", "Validation schema + typescript interface output directory", "./.ts-runtime-check");

program.parse();

const options = program.opts<ICommandOptions>();
console.log(options);
