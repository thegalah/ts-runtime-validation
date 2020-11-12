import { validate } from "./validate";
import "source-map-support/register";
const validData = {
    name: "someName",
};

const invalidData = {};

const doSomethingWithUnknownData = (raw: unknown) => {
    if (validate(raw, "#/definitions/SimpleSchema")) {
        console.log(`Valid schema: ${raw.name}`);
    } else {
        console.log(`Invalid data received errors`);
    }
};

doSomethingWithUnknownData(validData);
doSomethingWithUnknownData(invalidData);
