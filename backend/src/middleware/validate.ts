import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { ApiError } from '../lib/errors.js';

type Source = 'body' | 'query' | 'params';

/**
 * Valide et normalise une partie de la requête. La valeur analysée remplace
 * l'originale, ce qui donne aux handlers des données déjà typées et coercées.
 */
export function validate(schema: ZodTypeAny, source: Source = 'body'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        ApiError.badRequest('Données invalides', 'VALIDATION_ERROR', formatIssues(result.error)),
      );
    }
    // req.query est en lecture seule sur Express 5 ; on passe par defineProperty.
    Object.defineProperty(req, source, { value: result.data, writable: true, configurable: true });
    next();
  };
}

export function formatIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(racine)',
    code: issue.code,
    message: issue.message,
  }));
}

/** Enveloppe un handler asynchrone pour router les rejets vers le middleware d'erreur. */
export function asyncHandler<T extends RequestHandler>(fn: T): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
