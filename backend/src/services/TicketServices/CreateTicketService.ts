import AppError from "../../errors/AppError";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import Ticket from "../../models/Ticket";
import ShowContactService from "../ContactServices/ShowContactService";
import { getIO } from "../../libs/socket";

interface Request {
  contactId: number;
  status: string;
  userId: number;
  queueId?: number;
  whatsappId?: number;
}

const CreateTicketService = async ({
  contactId,
  status,
  userId,
  queueId,
  whatsappId
}: Request): Promise<Ticket> => {
  const defaultWhatsapp = await GetDefaultWhatsApp();

  await CheckContactOpenTickets(contactId);

  const { isGroup } = await ShowContactService(contactId);

  const { id }: Ticket = await Ticket.create({
    contactId,
    status,
    isGroup,
    userId,
    queueId,
    whatsappId: whatsappId || defaultWhatsapp.id
  });

  const ticket = await Ticket.findByPk(id, { include: ["contact", "queue"] });

  if (!ticket) {
    throw new AppError("ERR_CREATING_TICKET");
  }

  const io = getIO();

  io.to(ticket.id.toString()).emit("ticket", {
    action: "update",
    ticket
  });

  return ticket;
};

export default CreateTicketService;
