export const writeLine = (msg:string) =>{
    process.stdout.clearLine(0);
    process.stdout.write(msg);
}