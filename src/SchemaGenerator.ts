import { ICommandOptions } from "./index";
export class SchemaGenerator {
    public constructor(private options: ICommandOptions) {
        this.getMatchingFiles();
    }

    private getMatchingFiles = () => {};
}
