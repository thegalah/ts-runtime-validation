import { fdir } from "fdir";
import { ICommandOptions } from "./index";
import picomatch from "picomatch";

export class SchemaGenerator {
    public constructor(private options: ICommandOptions) {
        this.getMatchingFiles();
    }

    private getMatchingFiles = async () => {
        console.log(this.options);
        const { glob, rootPath } = this.options;
        const api = new fdir().crawlWithOptions(rootPath, {
            includeBasePath: true,
            includeDirs: false,
            filters: [
                (path) => {
                    return picomatch.isMatch(path, glob, { contains: true });
                },
            ],
        });
        const files = await api.withPromise();
        console.log(files);
    };
}
