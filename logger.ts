import { Config } from './types';

// Simple logging utility
export class Logger {
    constructor(private level: Config['logLevel'] = 'info') {}

    private shouldLog(messageLevel: Config['logLevel']): boolean {
        const levels = { error: 0, warn: 1, info: 2, debug: 3 };
        return levels[messageLevel] <= levels[this.level];
    }

    error(message: string): void {
        if (this.shouldLog('error')) {
            console.error(`ERROR: ${message}`);
        }
    }

    warn(message: string): void {
        if (this.shouldLog('warn')) {
            console.warn(`WARN: ${message}`);
        }
    }

    info(message: string): void {
        if (this.shouldLog('info')) {
            console.log(`INFO: ${message}`);
        }
    }

    debug(message: string): void {
        if (this.shouldLog('debug')) {
            console.log(`DEBUG: ${message}`);
        }
    }
}