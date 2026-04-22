import { ApiError } from '../types/api';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function extractMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as ApiError).message);
  }
  return 'Une erreur inattendue est survenue';
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof AppError && error.statusCode === 401;
}
