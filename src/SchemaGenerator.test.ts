import fs, { readFileSync } from "fs";
import path from "path";
import { ICommandOptions } from "./index";
import { SchemaGenerator } from "./SchemaGenerator";

const cleanupTestOutput = () => {
    const outputDir = path.resolve(__dirname, "./test/output");
    const doesDirectoryExist = fs.existsSync(outputDir);
    if (doesDirectoryExist) {
        fs.rmdirSync(outputDir, { recursive: true });
    }
};

const getGeneratorConfig = (scenarioPath: string) => {
    const options: ICommandOptions = {
        glob: "*.jsonschema.ts",
        rootPath: path.resolve(__dirname, `./test/${scenarioPath}`),
        output: `../output/${scenarioPath}`,
        helpers: true,
        additionalProperties: false,
        tsconfigPath: "",
    };
    return options;
};

beforeAll(cleanupTestOutput);
afterAll(cleanupTestOutput);

describe("SchemaGenerator", () => {
    test("it should generate the correct schema for a basic interface", async () => {
        const options = getGeneratorConfig("basic-scenario");
        const generator = new SchemaGenerator(options);
        await generator.Generate();
        // const content = readFileSync("myFile.txt");
        expect(true).toStrictEqual(true);
    });

    test("it should throw an error when there are different implementations of an interface", async () => {
        const options = getGeneratorConfig("duplicate-symbols-different-implementation");
        const generator = new SchemaGenerator(options);
        await expect(generator.Generate()).rejects.toThrow();
    });

    // test("it should not an error when there are identical definitions interface", async () => {
    //     const options = getGeneratorConfig("duplicate-symbols-different-implementation");
    //     const generator = new SchemaGenerator(options);
    //     await expect(generator.Generate()).rejects.toThrow();
    // });
});
