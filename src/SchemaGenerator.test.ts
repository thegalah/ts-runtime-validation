import fs from "fs";
import path from "path";
import { ICommandOptions } from "./index";
import { SchemaGenerator } from "./SchemaGenerator";

const cleanupTestOutput = () => {
    const outputDir = path.resolve(__dirname, "./test/output");
    fs.rmdirSync(outputDir, { recursive: true });
};

beforeAll(cleanupTestOutput);
afterAll(cleanupTestOutput);

describe("SchemaGenerator", () => {
    test("it should do stuff", async () => {
        const options: ICommandOptions = {
            glob: "*.jsonschema.ts",
            rootPath: path.resolve(__dirname, "./test/basic-scenario"),
            output: "../output",
            helpers: false,
            additionalProperties: false,
            tsconfigPath: "",
        };
        // expect(__dirname).toStrictEqual(true);
        const generator = new SchemaGenerator(options);
        await generator.Generate();
        expect(true).toStrictEqual(true);
    });
});
