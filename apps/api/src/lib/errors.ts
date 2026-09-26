export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400)
    this.name = 'ValidationError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403)
    this.name = 'ForbiddenError'
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message, 409)
    this.name = 'ConflictError'
  }
}

export function mapRouteError(
  err: unknown,
): { status: number; message: string } | null {
  if (err instanceof NotFoundError) return { status: 404, message: err.message }
  if (err instanceof ValidationError) return { status: 400, message: err.message }
  if (err instanceof ConflictError) return { status: 409, message: err.message }
  if (err instanceof ForbiddenError) return { status: 403, message: err.message }
  if (err instanceof AppError) return { status: err.statusCode, message: err.message }
  return null
}
