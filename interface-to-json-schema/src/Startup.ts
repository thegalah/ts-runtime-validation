import { SimpleSchema } from "./Types/SimpleSchema";
import { SchemaDefinition } from "./SchemaDefinition";
import { validate } from "./validate";
import "source-map-support/register";
const validData = {
    name: "someName",
};

const invalidData = {};

const doSomethingWithUnkownData = (raw: unknown) => {
    const result = validate<SimpleSchema>(raw, SchemaDefinition.SIMPLESCHEMA);
    if (result.errors) {
        console.log(`Invalid data received errors:`);
        console.log(result.errors);
    } else {
        const validData = result.data;
        console.log(`My name is: ${validData.name}`);
    }
};

doSomethingWithUnkownData(validData);
doSomethingWithUnkownData(invalidData);
