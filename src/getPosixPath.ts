import path from "path";

export const getPosixPath = (rawPath: string) => {
    const definitelyPosix = rawPath.split(path.sep).join(path.posix.sep);
    return definitelyPosix;
};
