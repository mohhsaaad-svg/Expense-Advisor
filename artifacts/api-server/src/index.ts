import app from "./app";
import { logger } from "./lib/logger";
import { assertSchemaReady } from "./lib/schemaCheck";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Refuse to serve against a database that predates user isolation — a clear
// boot error beats a 500 on every request. See lib/db/migrations/.
try {
  await assertSchemaReady();
} catch (err) {
  logger.fatal({ err }, "Database schema is not ready for this build");
  process.exit(1);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
