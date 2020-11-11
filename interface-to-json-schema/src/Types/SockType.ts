import { MockType } from "./MockType";
export interface SockType {
    readonly SomeString: string;
    readonly SomeNumber: number;
    readonly OptionalString?: string;
    readonly OptionalNumber?: number;
    readonly Nested: MockType;
}
