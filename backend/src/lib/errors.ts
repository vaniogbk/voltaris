/** Erreur métier portant un code HTTP et un code applicatif stable pour le frontend. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown) {
    return new ApiError(400, code, message, details);
  }
  static unauthorized(message = 'Authentification requise', code = 'UNAUTHORIZED') {
    return new ApiError(401, code, message);
  }
  static forbidden(message = 'Accès refusé', code = 'FORBIDDEN') {
    return new ApiError(403, code, message);
  }
  static notFound(message = 'Ressource introuvable', code = 'NOT_FOUND') {
    return new ApiError(404, code, message);
  }
  static conflict(message: string, code = 'CONFLICT', details?: unknown) {
    return new ApiError(409, code, message, details);
  }
  static unprocessable(message: string, code = 'UNPROCESSABLE', details?: unknown) {
    return new ApiError(422, code, message, details);
  }
  static internal(message = 'Erreur interne', code = 'INTERNAL') {
    return new ApiError(500, code, message);
  }
}
