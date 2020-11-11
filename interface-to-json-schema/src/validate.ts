import * as schema from "./validation.schema.json";
import Ajv from "ajv";

const validator = new Ajv();
validator.addSchema(schema);
console.log(schema.definitions);
Object.keys(schema.definitions);

export const validate = (data: unknown, schemaKeyRef: string) => {
    const isValid = validator.validate(schemaKeyRef, data);
    return isValid;
};
