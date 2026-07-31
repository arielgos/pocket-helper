import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// Configure global options for v2 functions
setGlobalOptions({ maxInstances: 10 });

export const health = onRequest((request, response) => {
  // Log request details safely (do NOT pass raw request or response objects)
  logger.info("Health check received", {
    method: request.method,
    path: request.path,
  });

  response.send("OK");
});
