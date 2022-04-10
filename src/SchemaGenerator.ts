import { fdir } from "fdir";
import { ICommandOptions } from "./index";

// get all files in a directory synchronously

export class SchemaGenerator {
    public constructor(private options: ICommandOptions) {
        this.getMatchingFiles();
    }

    private getMatchingFiles = async () => {
        console.log(this.options);
        const { glob, rootPath } = this.options;
        const api = new fdir().glob(glob).crawl(rootPath);
        const files = await api.withPromise();
        console.log(files);
    };
}
