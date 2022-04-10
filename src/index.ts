#!/usr/bin/env node
import { program } from "commander";

// import { fdir } from "fdir";

program.argument("glob", "Glob file path of typescript files to generate json schema validations for.");
program.action((glob) => {
    console.log(`provided glob: ${glob}`);
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
