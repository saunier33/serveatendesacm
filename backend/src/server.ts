import gracefulShutdown from "http-graceful-shutdown";
import app from "./app";
import { initIO } from "./libs/socket";
import { logger } from "./utils/logger";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import { startQueueProcess } from "./queues";

const server = app.listen(process.env.PORT, async () => {
  try {
    logger.info(`Server started on port: ${process.env.PORT}`);
    startQueueProcess();
    await StartAllWhatsAppsSessions();
  } catch (error: any) {
    logger.error(error.message)
  }
});

initIO(server);
gracefulShutdown(server);
