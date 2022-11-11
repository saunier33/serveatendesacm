import WAWebJS, { MessageMedia } from "whatsapp-web.js";
import { getIO } from "../libs/socket";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import GetWhatsappWbot from "./GetWhatsappWbot";

export type MessageData = {
  number: number | string;
  body: string;
  mediaPath?: string;
};

export const SendMessage = async (
  whatsapp: Whatsapp,
  messageData: MessageData
): Promise<WAWebJS.Message> => {
  try {
    const io = getIO();
    const wbot = await GetWhatsappWbot(whatsapp);
    const chatId = `${messageData.number}@c.us`;

    let message: WAWebJS.Message;
    const body = messageData.body;
    let closeTicket = false;

    if (/\u200c/.test(messageData.body)) {
      closeTicket = true;
    }

    if (messageData.mediaPath) {
      const newMedia = MessageMedia.fromFilePath(messageData.mediaPath);

      let options = {};

      if (/mp4|mpeg/.test(newMedia.mimetype)) {
        options = { sendMediaAsDocument: true };
      }

      if (/mp3|aac/.test(newMedia.mimetype)) {
        options = { sendAudioAsVoice: true };
      }

      message = await wbot.sendMessage(chatId, newMedia, options);
    } else {
      message = await wbot.sendMessage(chatId, body);
    }

    if (closeTicket) {
      setTimeout(async () => {
        const contact = await Contact.findOne({
          where: { number: messageData.number }
        });
        if (contact) {
          const ticket = await Ticket.findOne({
            where: { contactId: contact.id },
            order: [["createdAt", "DESC"]]
          });
          if (ticket) {
            const oldStatus = ticket.status;
            await ticket.update({ status: "closed" });

            io.to(oldStatus).emit("ticket", {
              action: "delete",
              ticketId: ticket.id
            });

            io.to(ticket.status)
              .to("notification")
              .to(ticket.id.toString())
              .emit("ticket", {
                action: "update",
                ticket
              });
          }
        }
      }, 5000);
    }

    return message;
  } catch (err: any) {
    console.error(err.message);
    throw new Error(err);
  }
};
