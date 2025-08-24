import { ProgressReporter } from "./ProgressReporter";

// Mock process.stdout for testing
const mockStdout = {
    isTTY: true,
    clearLine: jest.fn(),
    cursorTo: jest.fn(),
    write: jest.fn()
};

const originalStdout = process.stdout;

beforeEach(() => {
    // Reset mock functions
    mockStdout.clearLine = jest.fn();
    mockStdout.cursorTo = jest.fn();
    mockStdout.write = jest.fn();
    mockStdout.isTTY = true;
    
    // Replace process.stdout with mock
    Object.defineProperty(process, 'stdout', {
        value: mockStdout,
        configurable: true
    });
});

afterAll(() => {
    // Restore original stdout
    Object.defineProperty(process, 'stdout', {
        value: originalStdout,
        configurable: true
    });
});

describe("ProgressReporter", () => {
    describe("disabled reporter", () => {
        it("should not output anything when disabled", () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            const reporter = new ProgressReporter({
                enabled: false,
                total: 100,
                showBar: true
            });

            reporter.start("Starting task");
            reporter.update(50, "Half done");
            reporter.increment("Almost there");
            reporter.complete("Task completed");

            expect(consoleSpy).not.toHaveBeenCalled();
            expect(mockStdout.write).not.toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });
    });

    describe("enabled reporter without progress bar", () => {
        it("should show start and complete messages", () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            const reporter = new ProgressReporter({
                enabled: true,
                showBar: false
            });

            reporter.start("Starting task");
            reporter.complete("Task completed");

            expect(consoleSpy).toHaveBeenCalledWith("Starting task");
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Task completed"));
            
            consoleSpy.mockRestore();
        });

        it("should show custom update messages", () => {
            const reporter = new ProgressReporter({
                enabled: true,
                showBar: false
            });

            reporter.start("Starting");
            reporter.update(25, "Processing file 1");
            reporter.update(50, "Processing file 2");

            expect(mockStdout.write).toHaveBeenCalledWith("Processing file 1");
            expect(mockStdout.write).toHaveBeenCalledWith("Processing file 2");
        });

        it("should handle increment without message", () => {
            const reporter = new ProgressReporter({
                enabled: true,
                showBar: false
            });

            reporter.start("Starting");
            reporter.increment();

            // Should not crash when incrementing without message
            expect(() => reporter.increment()).not.toThrow();
        });
    });

    describe("enabled reporter with progress bar", () => {
        it("should draw progress bar", () => {
            const reporter = new ProgressReporter({
                enabled: true,
                total: 100,
                showBar: true
            });

            reporter.start("Processing files");
            reporter.update(25);
            
            expect(mockStdout.write).toHaveBeenCalledWith(
                expect.stringContaining("Progress: [")
            );
            expect(mockStdout.write).toHaveBeenCalledWith(
                expect.stringContaining("25%")
            );
            expect(mockStdout.write).toHaveBeenCalledWith(
                expect.stringContaining("(25/100)")
            );
        });

        it("should show 100% when complete", () => {
            const reporter = new ProgressReporter({
                enabled: true,
                total: 50,
                showBar: true
            });

            reporter.start("Processing");
            reporter.update(50);

            expect(mockStdout.write).toHaveBeenCalledWith(
                expect.stringContaining("100%")
            );
            expect(mockStdout.write).toHaveBeenCalledWith(
                expect.stringContaining("(50/50)")
            );
        });

        it("should handle progress beyond total", () => {
            const reporter = new ProgressReporter({
                enabled: true,
                total: 10,
                showBar: true
            });

            reporter.start("Processing");
            reporter.update(15); // More than total

            // Should cap at 100% but show actual numbers
            expect(mockStdout.write).toHaveBeenCalledWith(
                expect.stringContaining("(15/10)")
            );
        });

        it("should use increment correctly", () => {
            const reporter = new ProgressReporter({
                enabled: true,
                total: 3,
                showBar: true
            });

            reporter.start("Processing");
            reporter.increment(); // 1
            reporter.increment(); // 2
            reporter.increment(); // 3

            expect(mockStdout.write).toHaveBeenCalledWith(
                expect.stringContaining("(3/3)")
            );
        });
    });

    describe("time formatting", () => {
        it("should format completion time in different units", () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            // Mock Date.now to control timing
            const originalNow = Date.now;
            let currentTime = 1000;
            Date.now = jest.fn(() => currentTime);

            const reporter = new ProgressReporter({
                enabled: true
            });

            reporter.start("Processing");
            
            // Simulate 500ms elapsed
            currentTime = 1500;
            reporter.complete("Done");

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining("500ms")
            );

            consoleSpy.mockClear();

            // Test seconds
            currentTime = 1000; // Reset time
            reporter.start("Processing");
            currentTime = 3500; // 2.5 seconds elapsed
            reporter.complete("Done");

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining("2.5s")
            );

            consoleSpy.mockClear();

            // Test minutes
            currentTime = 1000; // Reset time
            reporter.start("Processing");
            currentTime = 126000; // 125 seconds = 2m 5s elapsed
            reporter.complete("Done");

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining("2m 5s")
            );

            // Restore Date.now
            Date.now = originalNow;
            consoleSpy.mockRestore();
        });
    });

    describe("TTY handling", () => {
        it("should handle non-TTY environments", () => {
            mockStdout.isTTY = false;
            (mockStdout as any).clearLine = undefined;

            const reporter = new ProgressReporter({
                enabled: true,
                total: 10,
                showBar: true
            });

            reporter.start("Processing");
            reporter.update(5);

            // Should not crash when clearLine is not available
            expect(mockStdout.write).toHaveBeenCalled();
        });

        it("should handle missing cursorTo", () => {
            mockStdout.isTTY = true;
            mockStdout.clearLine = jest.fn();
            (mockStdout as any).cursorTo = undefined;

            const reporter = new ProgressReporter({
                enabled: true,
                total: 10,
                showBar: true
            });

            reporter.start("Processing");
            reporter.update(5);

            // Should not crash when cursorTo is not available
            expect(mockStdout.write).toHaveBeenCalled();
        });
    });

    describe("edge cases", () => {
        it("should handle zero total", () => {
            const reporter = new ProgressReporter({
                enabled: true,
                total: 0,
                showBar: true
            });

            // Should not crash with zero total
            expect(() => {
                reporter.start("Processing");
                reporter.update(1);
            }).not.toThrow();
        });

        it("should handle negative progress", () => {
            const reporter = new ProgressReporter({
                enabled: true,
                total: 10,
                showBar: true
            });

            reporter.start("Processing");
            reporter.update(-5);

            // Should handle gracefully
            expect(mockStdout.write).toHaveBeenCalled();
        });

        it("should handle undefined total with progress bar", () => {
            const reporter = new ProgressReporter({
                enabled: true,
                total: undefined,
                showBar: true
            });

            // Should not crash with undefined total
            expect(() => {
                reporter.start("Processing");
                reporter.update(5);
            }).not.toThrow();
        });

        it("should handle very large numbers", () => {
            const reporter = new ProgressReporter({
                enabled: true,
                total: 1000000,
                showBar: true
            });

            reporter.start("Processing");
            reporter.update(500000);

            expect(mockStdout.write).toHaveBeenCalledWith(
                expect.stringContaining("50%")
            );
            expect(mockStdout.write).toHaveBeenCalledWith(
                expect.stringContaining("(500000/1000000)")
            );
        });
    });

    describe("visual progress bar", () => {
        it("should show correct bar fill at different percentages", () => {
            const reporter = new ProgressReporter({
                enabled: true,
                total: 100,
                showBar: true
            });

            reporter.start("Test");
            
            // 0%
            reporter.update(0);
            let lastCall = mockStdout.write.mock.calls[mockStdout.write.mock.calls.length - 1][0];
            expect(lastCall).toContain("░".repeat(30)); // All empty
            
            // 50%
            reporter.update(50);
            lastCall = mockStdout.write.mock.calls[mockStdout.write.mock.calls.length - 1][0];
            expect(lastCall).toContain("█".repeat(15)); // Half filled
            expect(lastCall).toContain("░".repeat(15)); // Half empty
            
            // 100%
            reporter.update(100);
            lastCall = mockStdout.write.mock.calls[mockStdout.write.mock.calls.length - 1][0];
            expect(lastCall).toContain("█".repeat(30)); // All filled
        });
    });
});