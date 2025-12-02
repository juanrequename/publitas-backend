import 'dotenv/config';

export const BYTES_PER_MB = 1024 * 1024;

export const config = {
  /** Maximum batch size in bytes */
  maxBatchSize: (parseFloat(process.env.MAX_BATCH_SIZE_MB ?? '') || 5) * BYTES_PER_MB,

  /** Logging level */
  logLevel: process.env.LOG_LEVEL ?? 'info',

  /** Current environment */
  nodeEnv: process.env.NODE_ENV ?? 'development',
} as const;
