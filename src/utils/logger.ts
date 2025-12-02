import pino from 'pino';
import { config } from '../config';

const logger = pino({
  level: config.logLevel,
  transport:
    config.nodeEnv !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        }
      : undefined,
});

export default logger;
