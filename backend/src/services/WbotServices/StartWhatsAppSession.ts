import { initWbot } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import { wbotMessageListener } from "./wbotMessageListener";
import { getIO } from "../../libs/socket";
import wbotMonitor from "./wbotMonitor";
import { logger } from "../../utils/logger";

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp
): Promise<void> => {
  try {
    await whatsapp.update({ status: "OPENING" });

    const io = getIO();
    io.emit("whatsappSession", {
      action: "update",
      session: whatsapp
    });
    const wbot = await initWbot(whatsapp);
    wbotMessageListener(wbot);
    wbotMonitor(wbot, whatsapp);
  } catch (err: any) {
    logger.error(err.message);
  }
};
