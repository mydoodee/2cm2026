const fs = require('fs').promises;
const path = require('path');

const logFilePath = path.join(__dirname, '../../logs/app.log');
const errorLogFilePath = path.join(__dirname, '../../logs/error.log');

async function ensureLogDirectory() {
  const logDir = path.dirname(logFilePath);
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch {
    // Silent fail - directory creation error should not crash the app
  }
}

async function log(message, data = {}) {
  if (!process.env.LOGGING_ENABLED) return;

  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message} ${JSON.stringify(data)}\n`;

  try {
    await ensureLogDirectory();
    await fs.appendFile(logFilePath, logEntry);
  } catch {
    // Silent fail - file write error should not crash the app
  }
}

async function logError(message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ERROR: ${message} ${JSON.stringify(data)}\n`;

  try {
    await ensureLogDirectory();
    await fs.appendFile(errorLogFilePath, logEntry);
  } catch {
    // Silent fail
  }
}

module.exports = { log, logError };

