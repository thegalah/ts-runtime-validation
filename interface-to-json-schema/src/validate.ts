import * as schema from "./validation.schema.json";
import Ajv from "ajv";

const validator = new Ajv({ allErrors: true });
validator.compile(schema);

export const validate = <T>(data: unknown, schemaKeyRef: string): { errors?: Array<Ajv.ErrorObject>; data: T } => {
    validator.validate(schemaKeyRef, data);
    const errors = validator.errors;
    return { errors, data: data as T };
};
