#!/usr/bin/env node
import { Command } from "commander";

// import { fdir } from "fdir";

const program = new Command();

program.argument("<string>", "glob");

program.parse();

program.action((glob) => {
    console.log(`Searching for glob ${glob}`);
});

// // create the builder
// const api = new fdir().withFullPaths().crawl("path/to/dir");

// // get all files in a directory synchronously
// const files = api.sync();

// // or asynchronously
// api.withPromise().then((files) => {
//     // do something with the result here.
// });
