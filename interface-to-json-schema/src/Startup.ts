import { validate } from "./validate";
import "source-map-support/register";
const validData = {
    name: "someName",
};

const invalidData = {};

const doSomethingWithUnkownData = (raw: unknown) => {
    if (validate(raw, "#/definitions/SimpleSchema")) {
        console.log(`Valid schema: ${raw.name}`);
    } else {
        console.log(`Invalid data received errors`);
    }
};

doSomethingWithUnkownData(validData);
doSomethingWithUnkownData(invalidData);
