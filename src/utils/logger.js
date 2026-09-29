'use strict';

/**
 * Logger đơn giản với timestamp + màu sắc + log level.
 * Cấu hình qua biến môi trường LOG_LEVEL (DEBUG | INFO | WARN | ERROR).
 * Mặc định: INFO
 */

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const COLORS = {
  DEBUG: '\x1b[36m', // cyan
  INFO:  '\x1b[32m', // green
  WARN:  '\x1b[33m', // yellow
  ERROR: '\x1b[31m', // red
  RESET: '\x1b[0m'
};

const configuredLevel = LEVELS[(process.env.LOG_LEVEL || 'INFO').toUpperCase()] ?? LEVELS.INFO;

function log(level, ...args) {
  if (LEVELS[level] < configuredLevel) return;
  const ts = new Date().toISOString();
  const color = COLORS[level] || '';
  const reset = COLORS.RESET;
  const prefix = `${color}[${ts}] [${level}]${reset}`;
  if (level === 'ERROR') {
    console.error(prefix, ...args);
  } else if (level === 'WARN') {
    console.warn(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}

module.exports = {
  debug: (...args) => log('DEBUG', ...args),
  info:  (...args) => log('INFO',  ...args),
  warn:  (...args) => log('WARN',  ...args),
  error: (...args) => log('ERROR', ...args),
};
