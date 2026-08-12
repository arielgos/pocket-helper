import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest, Request } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import type { Response } from "express";

// Configuration constants
const FUNCTION_MAX_INSTANCES = 10;

// Response constants
const HTTP_STATUS_OK = 200;
const HEALTH_CHECK_RESPONSE = "OK";

/**
 * RequestMetadata type definition for logging request information.
 */
type RequestMetadata = {
  readonly method: string;
  readonly path: string;
};

// Configure global options for v2 functions
setGlobalOptions({ maxInstances: FUNCTION_MAX_INSTANCES });

/**
 * Logs the health check request metadata.
 * @param request The request metadata to log.
 */
function logHealthCheck(request: RequestMetadata): void {
  logger.info("Health check received", {
    method: request.method,
    path: request.path,
  });
}

/**
 * Creates request metadata from the HTTP request.
 * @param request The HTTP request object.
 * @returns The extracted request metadata.
 */
function createRequestMetadata(request: Request): RequestMetadata {
  return {
    method: request.method,
    path: request.path,
  };
}

/**
 * Exposes a simple health endpoint for monitoring.
 * Returns HTTP 200 with "OK" message when the service is healthy.
 */
export const health = onRequest(
  (request: Request, response: Response): void => {
    try {
      const metadata = createRequestMetadata(request);
      logHealthCheck(metadata);

      response.status(HTTP_STATUS_OK).send(HEALTH_CHECK_RESPONSE);
    } catch (error) {
      logger.error("Health check failed", { error });
      response.status(500).send("Internal Server Error");
    }
  },
);
