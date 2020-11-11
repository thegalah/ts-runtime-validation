import { SomeEnum } from "./SomeEnum";

export interface MockType {
    readonly SomeString: string;
    readonly SomeNumber: number;
    readonly SomeUnionType: number | string | SomeEnum;
    readonly OptionalString?: string;
    readonly OptionalNumber?: number;
    readonly SomeEnum: SomeEnum;
}
