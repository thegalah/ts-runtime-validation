import fs from "fs";
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

const getOutputSchemaPath = (scenarioPath: string) => {
    return path.resolve(__dirname, `./test/output/${scenarioPath}`, "validation.schema.json");
};

beforeAll(cleanupTestOutput);
// afterAll(cleanupTestOutput);

describe("SchemaGenerator", () => {
    test("it should generate the correct schema for a basic interface", async () => {
        const scenarioPath = "basic-scenario";
        const options = getGeneratorConfig(scenarioPath);
        const generator = new SchemaGenerator(options);
        await generator.Generate();
        const rawFile = fs.readFileSync(getOutputSchemaPath(scenarioPath)).toString();
        const result = JSON.parse(rawFile);
        const expected = {
            $schema: "http://json-schema.org/draft-07/schema#",
            definitions: {
                IBasicTypes: {
                    type: "object",
                    properties: {
                        propertyA: {
                            type: "string",
                        },
                        propertyB: {
                            type: "string",
                        },
                    },
                    required: ["propertyA", "propertyB"],
                    additionalProperties: false,
                },
            },
        };
        expect(result).toStrictEqual(expected);
    });

    test("it should throw an error when there are different implementations of an interface", async () => {
        const options = getGeneratorConfig("duplicate-symbols-different-implementation");
        const generator = new SchemaGenerator(options);
        await expect(generator.Generate()).rejects.toThrow();
    });

    test("it should not an error when there are identical definitions interface", async () => {
        const scenarioPath = "duplicate-symbols-identitcal-implementation";
        const options = getGeneratorConfig(scenarioPath);
        const generator = new SchemaGenerator(options);
        await generator.Generate();
        const rawFile = fs.readFileSync(getOutputSchemaPath(scenarioPath)).toString();
        const result = JSON.parse(rawFile);
        const expected = {
            $schema: "http://json-schema.org/draft-07/schema#",
            definitions: {
                IBasicTypes: {
                    type: "object",
                    properties: {
                        propertyA: {
                            type: "string",
                        },
                        propertyB: {
                            type: "string",
                        },
                    },
                    required: ["propertyA", "propertyB"],
                    additionalProperties: false,
                },
            },
        };
        expect(result).toStrictEqual(expected);
    });
});
