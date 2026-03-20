import type { NextFunction, Request, Response } from 'express';

export function errorHandler(error: Error, _req: Request, res: Response, _next: NextFunction) {
  return res.status(400).json({
    success: false,
    error: {
      code: 'BAD_REQUEST',
      message: error.message,
    },
  });
}
