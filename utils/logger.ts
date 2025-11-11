/**
 * Logger Utility für kontrolliertes Logging
 * Umgebungsvariable DEBUG_LEVEL steuert, welche Logs angezeigt werden
 * 
 * DEBUG_LEVEL:
 *   0 = Production (nur Errors)
 *   1 = Minimal (Errors + wichtige Events)
 *   2 = Normal (Errors + wichtige Events + Warnings)
 *   3 = Verbose (alles)
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const DEBUG_LEVEL = __DEV__ ? 2 : 0; // Im Development: Normal, in Production: Errors only

const LOG_COLORS = {
  error: '🔴',
  warn: '🟡',
  info: '🔵',
  debug: '⚫',
};

const shouldLog = (level: LogLevel): boolean => {
  const levels: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };
  return levels[level] <= DEBUG_LEVEL;
};

export const logger = {
  /**
   * Kritische Fehler (immer geloggt)
   */
  error: (tag: string, message: string, error?: any) => {
    if (shouldLog('error')) {
      console.error(
        `${LOG_COLORS.error} [${tag}] ERROR: ${message}`,
        error ? `\n${error}` : ''
      );
    }
  },

  /**
   * Warnungen (ab Level 1)
   */
  warn: (tag: string, message: string) => {
    if (shouldLog('warn')) {
      console.warn(`${LOG_COLORS.warn} [${tag}] WARN: ${message}`);
    }
  },

  /**
   * Wichtige Events (ab Level 1)
   */
  info: (tag: string, message: string, data?: any) => {
    if (shouldLog('info')) {
      console.log(
        `${LOG_COLORS.info} [${tag}] ${message}`,
        data ? data : ''
      );
    }
  },

  /**
   * Debug Details (nur Level 3)
   */
  debug: (tag: string, message: string, data?: any) => {
    if (shouldLog('debug')) {
      console.log(
        `${LOG_COLORS.debug} [${tag}] DEBUG: ${message}`,
        data ? data : ''
      );
    }
  },

  /**
   * Performance Logging
   */
  time: (tag: string, label: string) => {
    if (shouldLog('debug')) {
      console.time(`[${tag}] ${label}`);
    }
  },

  timeEnd: (tag: string, label: string) => {
    if (shouldLog('debug')) {
      console.timeEnd(`[${tag}] ${label}`);
    }
  },
};

/**
 * Hilfsfunktion zum Aktivieren von Verbose Logging
 * Rufe diese in der App auf, um mehr Details zu sehen
 */
export const enableVerboseLogging = () => {
  console.log('🔧 Verbose logging enabled');
};
