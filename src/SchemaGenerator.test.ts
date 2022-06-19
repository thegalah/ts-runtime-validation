import path from "path";
import { ICommandOptions } from "./index";
import { SchemaGenerator } from "./SchemaGenerator";

describe("SchemaGenerator", () => {
    test("it should do stuff", async () => {
        const options: ICommandOptions = {
            glob: "*.jsonschema.ts",
            rootPath: path.resolve(__dirname, "./test/basic-scenario"),
            output: "./validation-types",
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
