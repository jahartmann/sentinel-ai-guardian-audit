import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Logger {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        // Console output with colors
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, category, ...meta }) => {
              const categoryStr = category ? `[${category}]` : '';
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} ${level}: ${categoryStr} ${message}${metaStr}`;
            })
          )
        }),
        
        // File output
        new winston.transports.File({
          filename: path.join(__dirname, '../logs/error.log'),
          level: 'error'
        }),
        new winston.transports.File({
          filename: path.join(__dirname, '../logs/combined.log')
        })
      ]
    });

    // Create logs directory if it doesn't exist
    this.ensureLogsDirectory();
  }

  ensureLogsDirectory() {
    import('fs').then(fs => {
      const logsDir = path.join(__dirname, '../logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
    });
  }

  info(category, message, meta = {}) {
    this.logger.info(message, { category, ...meta });
  }

  warn(category, message, meta = {}) {
    this.logger.warn(message, { category, ...meta });
  }

  error(category, message, meta = {}) {
    this.logger.error(message, { category, ...meta });
  }

  debug(category, message, meta = {}) {
    this.logger.debug(message, { category, ...meta });
  }

  // Specific logging methods for different components
  ssh(message, meta = {}) {
    this.info('SSH', message, meta);
  }

  ollama(message, meta = {}) {
    this.info('Ollama', message, meta);
  }

  audit(message, meta = {}) {
    this.info('Audit', message, meta);
  }

  api(message, meta = {}) {
    this.info('API', message, meta);
  }

  websocket(message, meta = {}) {
    this.info('WebSocket', message, meta);
  }
}