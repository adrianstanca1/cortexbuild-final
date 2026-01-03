import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom format for local development
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message} `;
    if (Object.keys(metadata).length > 0) {
        msg += JSON.stringify(metadata);
    }
    return msg;
});

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp(),
        process.env.NODE_ENV === 'production' ? json() : combine(colorize(), logFormat)
    ),
    transports: [
        new winston.transports.Console()
    ],
});

// Stream for Morgan (if you use it later)
export const stream = {
    write: (message: string) => {
        logger.info(message.trim());
    },
};
