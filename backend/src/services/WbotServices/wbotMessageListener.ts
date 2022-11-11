import { join } from "path";
import { promisify } from "util";
import { writeFile } from "fs";
import { head, isNull, isNil } from "lodash";
import * as Sentry from "@sentry/node";
import moment from "moment";

import {
  Contact as WbotContact,
  Message as WbotMessage,
  MessageAck,
  Client,
  Buttons,
  List,
  MessageMedia
} from "whatsapp-web.js";

import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import Queue from "../../models/Queue";

import { getIO } from "../../libs/socket";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { logger } from "../../utils/logger";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import { debounce } from "../../helpers/Debounce";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import QueueOption from "../../models/QueueOption";
import Setting from "../../models/Setting";
import UserRating from "../../models/UserRating";
import SendWhatsAppMessage from "./SendWhatsAppMessage";

interface Session extends Client {
  id?: number;
}

const writeFileAsync = promisify(writeFile);

const verifyContact = async (msgContact: WbotContact): Promise<Contact> => {
  const profilePicUrl = await msgContact.getProfilePicUrl();

  const contactData = {
    name: msgContact.name || msgContact.pushname || msgContact.id.user,
    number: msgContact.id.user,
    profilePicUrl,
    isGroup: msgContact.isGroup
  };

  const contact = CreateOrUpdateContactService(contactData);

  return contact;
};

const verifyQuotedMessage = async (
  msg: WbotMessage
): Promise<Message | null> => {
  if (!msg.hasQuotedMsg) return null;

  const wbotQuotedMsg = await msg.getQuotedMessage();

  if (wbotQuotedMsg.id == undefined) {
    return null;
  }

  const quotedMsg = await Message.findOne({
    where: { id: wbotQuotedMsg.id.id }
  });

  if (!quotedMsg) return null;

  return quotedMsg;
};

const verifyMediaMessage = async (
  msg: WbotMessage,
  ticket: Ticket,
  contact: Contact
): Promise<Message> => {
  const quotedMsg = await verifyQuotedMessage(msg);

  const media = await msg.downloadMedia();

  if (!media) {
    throw new Error("ERR_WAPP_DOWNLOAD_MEDIA");
  }

  if (!media.filename) {
    const ext = media.mimetype.split("/")[1].split(";")[0];
    media.filename = `${new Date().getTime()}.${ext}`;
  }

  try {
    await writeFileAsync(
      join(__dirname, "..", "..", "..", "public", media.filename),
      media.data,
      "base64"
    );
  } catch (err: any) {
    // Sentry.captureException(err);
    logger.error(err);
  }

  const messageData = {
    id: msg.id.id,
    ticketId: ticket.id,
    contactId: msg.fromMe ? undefined : contact.id,
    body: msg.body || media.filename,
    fromMe: msg.fromMe,
    read: msg.fromMe,
    mediaUrl: media.filename,
    mediaType: media.mimetype.split("/")[0],
    quotedMsgId: quotedMsg?.id
  };

  await ticket.update({ lastMessage: msg.body || media.filename });
  const newMessage = await CreateMessageService({ messageData });

  return newMessage;
};

export const verifyMessage = async (
  msg: WbotMessage,
  ticket: Ticket,
  contact: Contact
) => {
  const quotedMsg = await verifyQuotedMessage(msg);

  const messageData = {
    id: msg.id.id,
    ticketId: ticket.id,
    contactId: msg.fromMe ? undefined : contact.id,
    body: msg.body,
    fromMe: msg.fromMe,
    mediaType: msg.type,
    read: msg.fromMe,
    quotedMsgId: quotedMsg?.id
  };

  await ticket.update({ lastMessage: msg.body });
  await CreateMessageService({ messageData });
};

const verifyQueue = async (
  wbot: Session,
  msg: WbotMessage,
  ticket: Ticket,
  contact: Contact
) => {
  const setting = await Setting.findOne({
    where: { key: "queuesOptionType" }
  });

  const receivedOption = msg?.selectedRowId || msg?.selectedButtonId || "";
  const selectedButtonId = `${receivedOption}`;

  const { queues, greetingMessage } = await ShowWhatsAppService(wbot.id!);

  if (queues.length === 1) {
    const firstQueue = head(queues);
    let chatbot = false;
    if (firstQueue?.options) {
      chatbot = firstQueue.options.length > 0;
    }
    await UpdateTicketService({
      ticketData: { queueId: firstQueue?.id, chatbot },
      ticketId: ticket.id
    });

    return;
  }

  const choosenQueue = queues[+selectedButtonId - 1];

  if (choosenQueue) {
    let chatbot = false;
    if (choosenQueue?.options) {
      chatbot = choosenQueue.options.length > 0;
    }

    await UpdateTicketService({
      ticketData: { queueId: choosenQueue.id, chatbot },
      ticketId: ticket.id
    });

    if (
      choosenQueue.options.length == 0 &&
      choosenQueue.greetingMessage !== "" &&
      choosenQueue.greetingMessage !== null
    ) {
      if (choosenQueue.filePath == null) {
        const body = `\u200e${choosenQueue.greetingMessage}`;
        await wbot.sendMessage(`${contact.number}@c.us`, body);
      } else {
        const file = MessageMedia.fromFilePath(choosenQueue.filePath);
        await wbot.sendMessage(`${contact.number}@c.us`, file);
      }
    }
  } else {
    let buttonMessageTpl: any = {
      body: "Escolha uma opção",
      footer: "",
      buttons: []
    };

    let listMessageTpl: any = {
      title: "Atendimento",
      text: "Opções disponíveis",
      footer: "",
      section: {
        title: "Escolha uma das opções",
        rows: []
      }
    };

    queues.forEach((queue, index) => {
      buttonMessageTpl.buttons.push({
        id: `${index + 1}`,
        body: queue.name
      });
      listMessageTpl.section.rows.push({
        id: `${index + 1}`,
        title: queue.name
      });
    });

    if (setting && setting.value === "OPTION_LIST") {
      const listMessage = new List(
        listMessageTpl?.text,
        listMessageTpl?.section.title,
        [listMessageTpl?.section],
        listMessageTpl?.title
      );
      await wbot.sendMessage(
        `${ticket.contact.number}@${
          ticket.isGroup ? "g.us" : "s.whatsapp.net"
        }`,
        listMessage
      );
    } else {
      const buttonMessage = new Buttons(
        greetingMessage,
        buttonMessageTpl?.buttons
      );
      await wbot.sendMessage(
        `${ticket.contact.number}@${
          ticket.isGroup ? "g.us" : "s.whatsapp.net"
        }`,
        buttonMessage
      );
    }
  }
};

const isValidMsg = (msg: WbotMessage): boolean => {
  if (msg.from === "status@broadcast") return false;
  if (
    msg.type === "buttons_response" ||
    msg.type === "list_response" ||
    msg.type === "chat" ||
    msg.type === "audio" ||
    msg.type === "ptt" ||
    msg.type === "video" ||
    msg.type === "image" ||
    msg.type === "document" ||
    msg.type === "vcard" ||
    msg.type === "sticker"
  )
    return true;
  return false;
};

const handleChatbot = async (
  ticket: Ticket,
  msg: WbotMessage,
  wbot: Session,
  dontReadTheFirstQuestion: boolean = false
) => {
  const queue = await Queue.findByPk(ticket.queueId, {
    include: [
      {
        model: QueueOption,
        as: "options",
        where: { parentId: null },
        order: [
          ["option", "ASC"],
          ["createdAt", "ASC"]
        ]
      }
    ]
  });

  const receivedOption = msg?.selectedRowId || msg?.selectedButtonId || "";
  const selectedButtonId = `${receivedOption}`;

  if (selectedButtonId == "00") {
    // voltar para o menu inicial
    await ticket.update({ queueOptionId: null, chatbot: false, queueId: null });
    await verifyQueue(wbot, msg, ticket, ticket.contact);
    return;
  }

  if (
    !isNil(queue) &&
    !isNil(ticket.queueOptionId) &&
    selectedButtonId == "#"
  ) {
    // falar com atendente
    await ticket.update({ queueOptionId: null, chatbot: false });
    await wbot.sendMessage(
      `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
      "Aguarde, você será atendido em instantes."
    );

    return;
  } else if (
    !isNil(queue) &&
    !isNil(ticket.queueOptionId) &&
    selectedButtonId == "0"
  ) {
    // voltar para o menu anterior
    const option = await QueueOption.findByPk(ticket.queueOptionId);
    await ticket.update({ queueOptionId: option?.parentId });
  } else if (!isNil(queue) && !isNil(ticket.queueOptionId)) {
    // escolheu uma opção
    const count = await QueueOption.count({
      where: { parentId: ticket.queueOptionId }
    });
    let option: any = {};
    if (count == 1) {
      option = await QueueOption.findOne({
        where: { parentId: ticket.queueOptionId }
      });
    } else {
      option = await QueueOption.findOne({
        where: {
          option: selectedButtonId,
          parentId: ticket.queueOptionId
        }
      });
    }
    if (option) {
      await ticket.update({ queueOptionId: option?.id });
    }
  } else if (
    !isNil(queue) &&
    isNil(ticket.queueOptionId) &&
    !dontReadTheFirstQuestion
  ) {
    // não linha a primeira pergunta
    const option = queue?.options.find(o => o.id == +selectedButtonId);
    if (option) {
      await ticket.update({ queueOptionId: option?.id });
    }
  }

  await ticket.reload();

  let buttonMessageTpl: any = {
    body: "Escolha uma opção",
    footer: "",
    buttons: []
  };

  let listMessageTpl: any = {
    title: "Atendimento",
    text: "Opções disponíveis",
    footer: "",
    section: {
      title: "Escolha uma das opções",
      rows: []
    }
  };

  if (!isNil(queue) && isNil(ticket.queueOptionId)) {
    const queueOptions = await QueueOption.findAll({
      where: { queueId: ticket.queueId, parentId: null },
      order: [
        ["option", "ASC"],
        ["createdAt", "ASC"]
      ]
    });

    buttonMessageTpl.body = queue.greetingMessage || "Escolha uma opção";
    listMessageTpl.text = queue.greetingMessage || "Escolha uma opção";
    listMessageTpl.footer = queue.name || "Sacmais";

    queueOptions.forEach((option, i) => {
      buttonMessageTpl.buttons.push({
        id: option.id,
        body: option.title
      });
      listMessageTpl.section.rows.push({
        id: `${option?.id}`,
        title: option?.title
      });
    });

    if (queue.optionType === "OPTION_LIST") {
      const listMessage = new List(
        listMessageTpl?.text,
        listMessageTpl?.section.title,
        [listMessageTpl?.section],
        listMessageTpl?.title
      );
      await wbot.sendMessage(
        `${ticket.contact.number}@${
          ticket.isGroup ? "g.us" : "s.whatsapp.net"
        }`,
        listMessage
      );
    } else {
      const buttonMessage = new Buttons(
        buttonMessageTpl?.body,
        buttonMessageTpl?.buttons
      );
      await wbot.sendMessage(
        `${ticket.contact.number}@${
          ticket.isGroup ? "g.us" : "s.whatsapp.net"
        }`,
        buttonMessage
      );
      console.log(buttonMessage);
    }

    const opcoesFinais = new Buttons("Mais Opções", [
      {
        id: "00",
        body: "Menu inicial"
      }
    ]);

    await wbot.sendMessage(
      `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
      opcoesFinais
    );
  } else if (!isNil(queue) && !isNil(ticket.queueOptionId)) {
    const currentOption = await QueueOption.findByPk(ticket.queueOptionId);
    const queueOptions = await QueueOption.findAll({
      where: { parentId: ticket.queueOptionId },
      order: [
        ["option", "ASC"],
        ["createdAt", "ASC"]
      ]
    });

    buttonMessageTpl.footer = queue.name;

    listMessageTpl.title = currentOption?.title || "Atendimento";
    listMessageTpl.body =
      currentOption?.message || "Escolha uma das opções no botão abaixo";
    listMessageTpl.footer = queue.name || "Sacmais";

    if (
      currentOption?.path !== null &&
      currentOption?.path !== "" &&
      currentOption?.path !== undefined
    ) {
      const mediaPath = MessageMedia.fromFilePath(currentOption?.path);
      await wbot.sendMessage(
        `${ticket.contact.number}@${
          ticket.isGroup ? "g.us" : "s.whatsapp.net"
        }`,
        mediaPath
      );
    }

    if (queueOptions.length > 1) {
      if (!isNil(currentOption?.message) && currentOption?.message !== "") {
        buttonMessageTpl.body = `${currentOption?.title}\n\n`;
        buttonMessageTpl.body += `${currentOption?.message}`;
        buttonMessageTpl.footer = queue.name;
      }

      queueOptions.forEach(option => {
        buttonMessageTpl.buttons.push({
          id: option?.option,
          body: option.title
        });
        listMessageTpl.section.rows.push({
          id: `${option?.option}`,
          title: option?.title
        });
      });
    } else if (queueOptions.length == 1) {
      const firstOption = head(queueOptions);
      if (firstOption) {
        await wbot.sendMessage(
          `${ticket.contact.number}@${
            ticket.isGroup ? "g.us" : "s.whatsapp.net"
          }`,
          firstOption.message || firstOption.title
        );

        if (firstOption.finalize) {
          await UpdateTicketService({
            ticketData: { status: "closed" },
            ticketId: ticket.id
          });
          return;
        }
      }

      return;
    }

    if (currentOption?.optionType === "OPTION_LIST") {
      if (listMessageTpl.section.rows.length > 0) {
        const listMessage = new List(
          listMessageTpl?.text,
          listMessageTpl?.section.title,
          [listMessageTpl?.section],
          listMessageTpl?.title
        );
        await wbot.sendMessage(
          `${ticket.contact.number}@${
            ticket.isGroup ? "g.us" : "s.whatsapp.net"
          }`,
          listMessage
        );
      }
    } else {
      if (buttonMessageTpl.buttons.length > 0) {
        const buttonMessage = new Buttons(
          buttonMessageTpl?.body,
          buttonMessageTpl?.buttons
        );
        await wbot.sendMessage(
          `${ticket.contact.number}@${
            ticket.isGroup ? "g.us" : "s.whatsapp.net"
          }`,
          buttonMessage
        );
      }
    }

    if (currentOption?.finalize) {
      await UpdateTicketService({
        ticketData: { status: "closed" },
        ticketId: ticket.id
      });
      return;
    }

    const opcoesFinais = new Buttons("Outras Opções", [
      {
        id: "0",
        body: "Voltar"
      },
      {
        id: "00",
        body: "Menu inicial"
      },
      {
        id: "#",
        body: "Falar com o atendente"
      }
    ]);

    await wbot.sendMessage(
      `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
      opcoesFinais
    );
  }
};

const verifyRating = async (ticket: Ticket) => {
  const record = await UserRating.findOne({
    where: { ticketId: ticket.id, rate: null }
  });
  if (record) {
    return true;
  }
  return false;
};

const handleRating = async (msg: WbotMessage, ticket: Ticket) => {
  const io = getIO();
  let rate: number | null = null;

  const bodyMessage = msg.body;

  if (bodyMessage) {
    rate = +bodyMessage;
  }

  if (!Number.isNaN(rate) && Number.isInteger(rate) && !isNull(rate)) {
    const { farewellMessage } = await ShowWhatsAppService(ticket.whatsappId);

    let finalRate = rate;

    if (rate < 1) {
      finalRate = 1;
    }
    if (rate > 3) {
      finalRate = 3;
    }

    const record = await UserRating.findOne({
      where: {
        ticketId: ticket.id,
        rate: null
      }
    });

    await record?.update({ rate: finalRate });

    const body = `\u200c${farewellMessage}`;
    await SendWhatsAppMessage({ body, ticket });

    await ticket.update({
      queueId: null,
      userId: null,
      status: "closed"
    });

    io.to("open").emit(`ticket`, {
      action: "delete",
      ticket,
      ticketId: ticket.id
    });

    io.to(ticket.status).to(ticket.id.toString()).emit(`ticket`, {
      action: "update",
      ticket,
      ticketId: ticket.id
    });
  }
};

const handleMessage = async (
  msg: WbotMessage,
  wbot: Session
): Promise<void> => {
  if (!isValidMsg(msg) || /\u200c/.test(msg.body)) {
    return;
  }

  try {
    let msgContact: WbotContact;
    let groupContact: Contact | undefined;

    if (msg.fromMe) {
      // messages sent automatically by wbot have a special character in front of it
      // if so, this message was already been stored in database;
      if (/\u200e/.test(msg.body[0])) return;

      // media messages sent from me from cell phone, first comes with "hasMedia = false" and type = "image/ptt/etc"
      // in this case, return and let this message be handled by "media_uploaded" event, when it will have "hasMedia = true"

      if (!msg.hasMedia && msg.type !== "chat" && msg.type !== "vcard") return;

      msgContact = await wbot.getContactById(msg.to);
    } else {
      msgContact = await msg.getContact();
    }

    const chat = await msg.getChat();

    if (chat.isGroup) {
      return;
    }

    if (chat.isGroup) {
      let msgGroupContact;

      if (msg.fromMe) {
        msgGroupContact = await wbot.getContactById(msg.to);
      } else {
        msgGroupContact = await wbot.getContactById(msg.from);
      }

      groupContact = await verifyContact(msgGroupContact);
    }

    const unreadMessages = msg.fromMe ? 0 : chat.unreadCount;

    const contact = await verifyContact(msgContact);
    const ticket = await FindOrCreateTicketService(
      contact,
      wbot.id!,
      unreadMessages,
      groupContact
    );

    try {
      if (!msg.fromMe) {
        const ratePending = await verifyRating(ticket);
        /**
         * Tratamento para avaliação do atendente
         */
        if (ratePending) {
          handleRating(msg, ticket);
          return;
        }
      }
    } catch (e) {
      Sentry.captureException(e);
      console.log(e);
    }

    if (msg.hasMedia) {
      await verifyMediaMessage(msg, ticket, contact);
    } else {
      await verifyMessage(msg, ticket, contact);
    }

    const whatsapp = await ShowWhatsAppService(wbot.id!);

    const dontReadTheFirstQuestion = ticket.queue === null;

    if (
      !ticket.queue &&
      !chat.isGroup &&
      !msg.fromMe &&
      !ticket.userId &&
      whatsapp.queues.length >= 1
    ) {
      await verifyQueue(wbot, msg, ticket, contact);
    }

    await ticket.reload();

    try {
      const setting = await Setting.findOne({ where: { key: "schedules" } });
      if (
        !msg.fromMe &&
        setting &&
        setting.value !== null &&
        setting.value !== ""
      ) {
        const schedules = JSON.parse(setting.value);
        const now = moment();
        const weekday = now.format("dddd").toLowerCase();
        let schedule = null;

        if (Array.isArray(schedules) && schedules.length > 0) {
          schedule = schedules.find(
            s =>
              s.weekdayEn === weekday &&
              s.startTime !== "" &&
              s.startTime !== null &&
              s.endTime !== "" &&
              s.endTime !== null
          );
        }

        if (
          whatsapp.outOfHoursMessage !== null &&
          whatsapp.outOfHoursMessage !== "" &&
          !isNil(schedule)
        ) {
          const startTime = moment(schedule.startTime, "HH:mm");
          const endTime = moment(schedule.endTime, "HH:mm");

          if (now.isBefore(startTime) || now.isAfter(endTime)) {
            const body = `${whatsapp.outOfHoursMessage}`;
            const debouncedSentMessage = debounce(
              async () => {
                await wbot.sendMessage(`${contact.number}@c.us`, body);
              },
              3000,
              ticket.id
            );
            debouncedSentMessage();
            return;
          }
        }
      }
    } catch (e) {
      console.log(e);
    }

    if (
      isNull(ticket.queueId) &&
      ticket.status !== "open" &&
      !msg.fromMe &&
      whatsapp.queues.length <= 1
    ) {
      const greetingMessage = whatsapp.greetingMessage || "";
      if (
        greetingMessage !== "" &&
        whatsapp.greetingMessage !== "" &&
        whatsapp.greetingMessage !== null
      ) {
        await wbot.sendMessage(`${contact.number}@c.us`, greetingMessage);
        return;
      }
    }

    if (whatsapp.queues.length == 1 && ticket.queue) {
      if (ticket.chatbot && !msg.fromMe) {
        await handleChatbot(ticket, msg, wbot);
      }
    }
    if (whatsapp.queues.length > 1 && ticket.queue) {
      if (ticket.chatbot && !msg.fromMe) {
        await handleChatbot(ticket, msg, wbot, dontReadTheFirstQuestion);
      }
    }
  } catch (err) {
    // Sentry.captureException(err);
    logger.error(`Error handling whatsapp message: Err: ${err}`);
  }
};

const handleMsgAck = async (msg: WbotMessage, ack: MessageAck) => {
  await new Promise(r => setTimeout(r, 500));

  const io = getIO();

  try {
    const messageToUpdate = await Message.findByPk(msg.id.id, {
      include: [
        "contact",
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        }
      ]
    });
    if (!messageToUpdate) {
      return;
    }
    await messageToUpdate.update({ ack });

    io.to(messageToUpdate.ticketId.toString()).emit("appMessage", {
      action: "update",
      message: messageToUpdate
    });
  } catch (err) {
    // Sentry.captureException(err);
    logger.error(`Error handling message ack. Err: ${err}`);
  }
};

const wbotMessageListener = (wbot: Session): void => {
  wbot.on("message_create", async msg => {
    handleMessage(msg, wbot);
  });

  wbot.on("media_uploaded", async msg => {
    handleMessage(msg, wbot);
  });

  wbot.on("message_ack", async (msg, ack) => {
    handleMsgAck(msg, ack);
  });
};

export { wbotMessageListener, handleMessage };
