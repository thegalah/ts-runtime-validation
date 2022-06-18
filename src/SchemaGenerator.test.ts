import { ICommandOptions } from "./index";
import { SchemaGenerator } from "./SchemaGenerator";
describe("SchemaGenerator", () => {
    test("it should do stuff", async () => {
        const options: ICommandOptions = {
            glob: "*.jsonschema.ts",
            rootPath: "./test/basic-scenario",
            output: "./validation-types",
            helpers: false,
            additionalProperties: false,
            tsconfigPath: "",
        };
        const generator = new SchemaGenerator(options);
        await generator.Generate();
        expect(true).toStrictEqual(true);
    });
});
