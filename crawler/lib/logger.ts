/* lib/logger.ts
   Structured logging infrastructure for TA worker monitoring
*/

import { EventEmitter } from 'events';
import { LogEntry } from './monitoring-types';

export class Logger extends EventEmitter {
  private readonly logLevels: Record<LogEntry['level'], number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4
  };
  private currentLevel: LogEntry['level'] = 'info';
  private logs: LogEntry[] = [];
  private readonly maxLogs = 10000;

  constructor(level: LogEntry['level'] = 'info') {
    super();
    this.currentLevel = level;
  }

  setLevel(level: LogEntry['level']): void {
    this.currentLevel = level;
  }

  private shouldLog(level: LogEntry['level']): boolean {
    return this.logLevels[level] >= this.logLevels[this.currentLevel];
  }

  private addLog(level: LogEntry['level'], message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context,
      traceId: context?.traceId,
      spanId: context?.spanId
    };

    this.logs.push(logEntry);

    // Remove old logs if we exceed the limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.emit('logEntry', logEntry);
    
    // Also emit to console for development
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date(logEntry.timestamp).toISOString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      console.log(`${prefix} ${message}`, context ? context : '');
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.addLog('debug', message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.addLog('info', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.addLog('warn', message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    this.addLog('error', message, context);
  }

  fatal(message: string, context?: Record<string, any>): void {
    this.addLog('fatal', message, context);
  }

  getLogs(level?: LogEntry['level'], limit?: number): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return filteredLogs.sort((a, b) => b.timestamp - a.timestamp);
  }

  clearLogs(): void {
    this.logs = [];
    this.emit('logsCleared');
  }

  getLogStats(): Record<LogEntry['level'], number> {
    const stats: Record<LogEntry['level'], number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0
    };

    this.logs.forEach(log => {
      stats[log.level]++;
    });

    return stats;
  }
}

