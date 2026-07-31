import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

setGlobalOptions({ maxInstances: 10 });

export const health = onRequest((request, response) => {
  logger.info("Health check", { structuredData: true });
  response.send("OK");
});
