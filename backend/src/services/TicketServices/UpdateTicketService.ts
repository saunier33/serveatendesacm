import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import Queue from "../../models/Queue";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import { verifyMessage } from "../WbotServices/wbotMessageListener";
import { isNil } from "lodash";
import Whatsapp from "../../models/Whatsapp";
import UserRating from "../../models/UserRating";

interface TicketData {
  status?: string;
  userId?: number;
  queueId?: number | null;
  chatbot?: boolean;
  queueOptionId?: number;
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

const UpdateTicketService = async ({
  ticketData,
  ticketId
}: Request): Promise<Response> => {
  const io = getIO();

  const { status, userId } = ticketData;
  let { queueId } = ticketData;
  let chatbot: boolean | null = ticketData.chatbot || false;
  let queueOptionId: number | null = ticketData.queueOptionId || null;

  const ticket = await ShowTicketService(ticketId);

  await SetTicketMessagesAsRead(ticket);

  const oldStatus = ticket.status;
  const oldUserId = ticket.user?.id;
  const oldQueueId = ticket.queueId;

  if (oldStatus === "closed") {
    await CheckContactOpenTickets(ticket.contact.id);
  }

  if (oldStatus !== "closed" && status === "closed") {
    queueId = null;
    chatbot = null;
    queueOptionId = null;

    const { farewellMessage, ratingMessage } = await ShowWhatsAppService(
      ticket.whatsappId
    );

    if (
      ratingMessage !== "" &&
      ratingMessage !== null &&
      oldStatus == "open" &&
      status === "closed"
    ) {
      const [, created] = await UserRating.findOrCreate({
        where: {
          ticketId: ticket.id,
          userId: ticket.userId,
          rate: null
        },
        defaults: {
          ticketId: ticket.id,
          userId: ticket.userId
        }
      });

      if (created) {
        let bodyRatingMessage = `${ratingMessage}\n\n`;
        bodyRatingMessage +=
          "Digite de 1 à 3 para qualificar nosso atendimento:\n*1* - _Insatisfeito_\n*2* - _Satisfeito_\n*3* - _Muito Satisfeito_";
        const messageSent = await SendWhatsAppMessage({
          body: bodyRatingMessage,
          ticket
        });

        await verifyMessage(messageSent, ticket, ticket.contact);
      }

      io.to(oldStatus).emit(`ticket`, {
        action: "delete",
        ticketId: ticket.id
      });

      return { ticket, oldStatus, oldUserId };
    }

    if (!isNil(farewellMessage) && farewellMessage !== "") {
      const body = `\u200e${farewellMessage}`;
      await SendWhatsAppMessage({ body, ticket });
    }
  }

  if (oldQueueId !== queueId && !isNil(oldQueueId) && !isNil(queueId)) {
    const queue = await Queue.findByPk(queueId);
    let body = `\u200e${queue?.greetingMessage}`;
    const wbot = await GetTicketWbot(ticket);

    const queueChangedMessage = await wbot.sendMessage(
      `${ticket.contact.number}@c.us`,
      "\u200eVocê foi transferido, em breve iremos iniciar seu atendimento."
    );
    await verifyMessage(queueChangedMessage, ticket, ticket.contact);

    // mensagem padrão desativada em caso de troca de fila
    // const sentMessage = await wbot.sendMessage(`${ticket.contact.number}@c.us`, body);
    // await verifyMessage(sentMessage, ticket, ticket.contact);
  }

  await ticket.update({
    status,
    queueId,
    userId,
    chatbot,
    queueOptionId
  });

  await ticket.reload();

  if (ticket.status !== oldStatus || ticket.user?.id !== oldUserId) {
    io.to(oldStatus).emit("ticket", {
      action: "delete",
      ticketId: ticket.id
    });
  }

  io.to(ticket.status)
    .to("notification")
    .to(ticketId.toString())
    .emit("ticket", {
      action: "update",
      ticket
    });

  return { ticket, oldStatus, oldUserId };
};

export default UpdateTicketService;
