// Plugin Logger Implementation
// Secure logging system for plugins

import { PluginLogger as IPluginLogger } from '../types';

export class PluginLogger implements IPluginLogger {
  private pluginId: string;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 1000;

  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  error(message: string | Error, meta?: any): void {
    const errorMessage = message instanceof Error ? message.message : message;
    const errorMeta = {
      ...meta,
      stack: message instanceof Error ? message.stack : undefined
    };
    this.log('error', errorMessage, errorMeta);
  }

  private log(level: string, message: string, meta?: any): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      pluginId: this.pluginId,
      message: this.sanitizeMessage(message),
      meta: meta ? this.sanitizeMeta(meta) : undefined
    };

    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Also log to console with plugin prefix
    const logMethod = console[level as keyof Console] || console.log;
    const prefix = `[Plugin:${this.pluginId}]`;
    
    if (meta) {
      (logMethod as any)(prefix, message, meta);
    } else {
      (logMethod as any)(prefix, message);
    }
  }

  private sanitizeMessage(message: string): string {
    // Remove potential sensitive data patterns
    return message
      .replace(/password[=:]\s*\S+/gi, 'password=***')
      .replace(/token[=:]\s*\S+/gi, 'token=***')
      .replace(/key[=:]\s*\S+/gi, 'key=***')
      .replace(/secret[=:]\s*\S+/gi, 'secret=***');
  }

  private sanitizeMeta(meta: any): any {
    if (typeof meta !== 'object' || meta === null) {
      return meta;
    }

    const sanitized = { ...meta };
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '***';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeMeta(sanitized[key]);
      }
    }

    return sanitized;
  }

  getLogs(level?: string, limit = 100): LogEntry[] {
    let logs = [...this.logBuffer];
    
    if (level) {
      logs = logs.filter(entry => entry.level === level);
    }
    
    return logs.slice(-limit);
  }

  clearLogs(): void {
    this.logBuffer = [];
  }
}

interface LogEntry {
  timestamp: Date;
  level: string;
  pluginId: string;
  message: string;
  meta?: any;
}
