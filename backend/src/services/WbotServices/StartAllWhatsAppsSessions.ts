import { logger } from "../../utils/logger";
import ListWhatsAppsService from "../WhatsappService/ListWhatsAppsService";
import { StartWhatsAppSession } from "./StartWhatsAppSession";

export const StartAllWhatsAppsSessions = async (): Promise<void> => {
  try {
    const whatsapps = await ListWhatsAppsService();
    if (whatsapps.length > 0) {
      for(let whatsapp of whatsapps) {
        await StartWhatsAppSession(whatsapp);
      }
    }
  } catch (error: any) {
    logger.error(error.message)
  }
};
