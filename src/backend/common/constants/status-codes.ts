/**
 * HTTP Status Codes
 * 
 * Defines standardized HTTP status codes used throughout the Refunds Service API.
 * This includes enumerations for semantic status code references and mappings to
 * their corresponding numeric values and standard messages.
 * 
 * This provides a consistent approach to HTTP status codes across the application,
 * supporting both error handling and API response validation.
 */

/**
 * Enumeration of standard HTTP status codes used throughout the application
 */
export enum StatusCode {
  OK = 'OK',
  CREATED = 'CREATED',
  ACCEPTED = 'ACCEPTED',
  NO_CONTENT = 'NO_CONTENT',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  GONE = 'GONE',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_GATEWAY = 'BAD_GATEWAY',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT'
}

/**
 * Maps status code enum values to their corresponding HTTP numeric codes
 */
export const HTTP_STATUS_CODES: Record<StatusCode, number> = {
  [StatusCode.OK]: 200,
  [StatusCode.CREATED]: 201,
  [StatusCode.ACCEPTED]: 202,
  [StatusCode.NO_CONTENT]: 204,
  [StatusCode.BAD_REQUEST]: 400,
  [StatusCode.UNAUTHORIZED]: 401,
  [StatusCode.PAYMENT_REQUIRED]: 402,
  [StatusCode.FORBIDDEN]: 403,
  [StatusCode.NOT_FOUND]: 404,
  [StatusCode.METHOD_NOT_ALLOWED]: 405,
  [StatusCode.CONFLICT]: 409,
  [StatusCode.GONE]: 410,
  [StatusCode.UNPROCESSABLE_ENTITY]: 422,
  [StatusCode.TOO_MANY_REQUESTS]: 429,
  [StatusCode.INTERNAL_SERVER_ERROR]: 500,
  [StatusCode.BAD_GATEWAY]: 502,
  [StatusCode.SERVICE_UNAVAILABLE]: 503,
  [StatusCode.GATEWAY_TIMEOUT]: 504
};

/**
 * Maps status code enum values to their standard descriptive messages
 */
export const HTTP_STATUS_MESSAGES: Record<StatusCode, string> = {
  [StatusCode.OK]: 'OK',
  [StatusCode.CREATED]: 'Created',
  [StatusCode.ACCEPTED]: 'Accepted',
  [StatusCode.NO_CONTENT]: 'No Content',
  [StatusCode.BAD_REQUEST]: 'Bad Request',
  [StatusCode.UNAUTHORIZED]: 'Unauthorized',
  [StatusCode.PAYMENT_REQUIRED]: 'Payment Required',
  [StatusCode.FORBIDDEN]: 'Forbidden',
  [StatusCode.NOT_FOUND]: 'Not Found',
  [StatusCode.METHOD_NOT_ALLOWED]: 'Method Not Allowed',
  [StatusCode.CONFLICT]: 'Conflict',
  [StatusCode.GONE]: 'Gone',
  [StatusCode.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
  [StatusCode.TOO_MANY_REQUESTS]: 'Too Many Requests',
  [StatusCode.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
  [StatusCode.BAD_GATEWAY]: 'Bad Gateway',
  [StatusCode.SERVICE_UNAVAILABLE]: 'Service Unavailable',
  [StatusCode.GATEWAY_TIMEOUT]: 'Gateway Timeout'
};