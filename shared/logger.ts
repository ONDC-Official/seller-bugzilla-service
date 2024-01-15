import pino from 'pino'
import expressPino from 'express-pino-logger'

export const logger = pino({
  level: 'info',
})

export const expressLogger = expressPino({
  logger,
})
