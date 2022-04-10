import { fdir } from "fdir";
import { ICommandOptions } from "./index";

// get all files in a directory synchronously

export class SchemaGenerator {
    public constructor(private options: ICommandOptions) {
        this.getMatchingFiles();
    }

    private getMatchingFiles = async () => {
        console.log(this.options);
        const { glob } = this.options;
        const api = new fdir().withFullPaths().crawl(glob);
        const files = await api.withPromise();
        console.log(files);
    };
}
