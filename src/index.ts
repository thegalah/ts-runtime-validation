#!/usr/bin/env node
import { program } from "commander";

// import { fdir } from "fdir";

program.argument("glob", "Glob file path of typescript files to generate ts-interface -> json-schema validations for.");
program.argument("output", "Validation schema output and validation path");
program.action((glob, outputPath = ".ts-runtime-check") => {
    console.log(`provided glob: ${glob}`);
    console.log(`output path: ${outputPath}`);
});

program.parse();

const options = program.opts();

// // create the builder
// const api = new fdir().withFullPaths().crawl("path/to/dir");

// // get all files in a directory synchronously
// const files = api.sync();

// // or asynchronously
// api.withPromise().then((files) => {
//     // do something with the result here.
// });
