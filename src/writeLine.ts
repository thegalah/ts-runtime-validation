export const writeLine = (msg:string) =>{
    if (process.stdout.isTTY && process.stdout.clearLine) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
    }
    process.stdout.write(msg);
}