// Simple logger implementation
export const logger = {
  info: (message, ...meta) => {
    console.log(JSON.stringify({ level: 'info', timestamp: new Date().toISOString(), message, meta: meta.length ? meta : undefined }));
  },
  error: (message, ...meta) => {
    console.error(JSON.stringify({ level: 'error', timestamp: new Date().toISOString(), message, meta: meta.length ? meta : undefined }));
  },
  warn: (message, ...meta) => {
    console.warn(JSON.stringify({ level: 'warn', timestamp: new Date().toISOString(), message, meta: meta.length ? meta : undefined }));
  },
  debug: (message, ...meta) => {
    console.debug(JSON.stringify({ level: 'debug', timestamp: new Date().toISOString(), message, meta: meta.length ? meta : undefined }));
  }
};
