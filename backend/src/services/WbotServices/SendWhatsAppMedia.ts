import fs from "fs";
import path from "path";
import { MessageMedia, Message as WbotMessage } from "whatsapp-web.js";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
}

const SendWhatsAppMedia = async ({
  media,
  ticket
}: Request): Promise<WbotMessage> => {
  try {
    const file = fs.statSync(path.resolve("../../", media.path));
    const newMedia = MessageMedia.fromFilePath(media.path);
    newMedia.filesize = file.size;

    const wbot = await GetTicketWbot(ticket);

    let options = {};

    if (/mp4|mpeg/.test(newMedia.mimetype)) {
      options = { sendMediaAsDocument: true };
    }

    if (/mp3|aac/.test(newMedia.mimetype)) {
      options = { sendAudioAsVoice: true };
    }

    const sentMessage = await wbot.sendMessage(
      `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`,
      newMedia,
      options
    );

    await ticket.update({ lastMessage: media.filename });

    fs.unlinkSync(media.path);

    return sentMessage;
  } catch (err: any) {
    logger.error(err.message);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
