import { SchemaDefinition } from "./SchemaDefinition";
import { validate } from "./validate";
import "source-map-support/register";
console.log("hello world");
const data = {
    name: "someName",
};
console.log(validate(data, SchemaDefinition.SIMPLESCHEMA));
