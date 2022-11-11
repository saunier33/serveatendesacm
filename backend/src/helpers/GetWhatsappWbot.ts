import { Client as Session } from "whatsapp-web.js";
import { getWbot } from "../libs/wbot";
import Whatsapp from "../models/Whatsapp";

const GetWhatsappWbot = async (whatsapp: Whatsapp): Promise<Session> => {
  const wbot = await getWbot(whatsapp.id);
  return wbot;
};

export default GetWhatsappWbot;
