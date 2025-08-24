export interface ProgressReporterOptions {
    enabled: boolean;
    total?: number;
    showBar?: boolean;
}

export class ProgressReporter {
    private current: number = 0;
    private startTime: number = Date.now();
    
    constructor(public options: ProgressReporterOptions) {}
    
    public start(message: string): void {
        if (!this.options.enabled) return;
        
        this.startTime = Date.now();
        this.current = 0;
        console.log(message);
        
        if (this.options.showBar && this.options.total) {
            this.drawProgressBar();
        }
    }
    
    public update(current: number, message?: string): void {
        if (!this.options.enabled) return;
        
        this.current = current;
        
        if (message) {
            this.clearLine();
            process.stdout.write(message);
        } else if (this.options.showBar && this.options.total) {
            this.drawProgressBar();
        }
    }
    
    public increment(message?: string): void {
        this.update(this.current + 1, message);
    }
    
    public complete(message: string): void {
        if (!this.options.enabled) return;
        
        const elapsed = Date.now() - this.startTime;
        this.clearLine();
        console.log(`${message} (${this.formatTime(elapsed)})`);
    }
    
    private drawProgressBar(): void {
        if (!this.options.total) return;
        
        const percentage = Math.min(100, Math.floor((this.current / this.options.total) * 100));
        const barLength = 30;
        const filled = Math.max(0, Math.min(barLength, Math.floor((this.current / this.options.total) * barLength)));
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
        
        this.clearLine();
        process.stdout.write(
            `Progress: [${bar}] ${percentage}% (${this.current}/${this.options.total})`
        );
    }
    
    private clearLine(): void {
        if (process.stdout.isTTY && process.stdout.clearLine && process.stdout.cursorTo) {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
        }
    }
    
    private formatTime(ms: number): string {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    }
}