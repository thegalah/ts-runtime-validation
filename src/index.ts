#!/usr/bin/env node
import { program } from "commander";

interface IOptions {
    readonly glob: string;
    readonly output: string;
}

// import { fdir } from "fdir";

program.option("--glob", "Glob file path of typescript files to generate ts-interface -> json-schema validations for.", "*");
program.option("--output", "Validation schema + typescript interface output directory", "./.ts-runtime-check");

// program.addArgument("<glob>", "Glob file path of typescript files to generate ts-interface -> json-schema validations for.", "*");
// program.addArgument("<outputPath>", "Validation schema output and validation path"), ".ts-runtime-check";
// program.action((glob, outputPath) => {
//     console.log(`provided glob: ${glob}`);
//     console.log(`output path: ${outputPath}`);
// });

program.parse();

const options = program.opts<IOptions>();
console.log(options);

// program.parse();

// const args = program.arguments;
// console.log(args);

// // create the builder
// const api = new fdir().withFullPaths().crawl("path/to/dir");

// // get all files in a directory synchronously
// const files = api.sync();

// // or asynchronously
// api.withPromise().then((files) => {
//     // do something with the result here.
// });
