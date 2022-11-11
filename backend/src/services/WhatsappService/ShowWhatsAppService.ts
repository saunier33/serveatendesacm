import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import QueueOption from "../../models/QueueOption";

const ShowWhatsAppService = async (id: string | number): Promise<Whatsapp> => {
  const whatsapp = await Whatsapp.findByPk(id, {
    include: [
      {
        model: Queue,
        as: "queues",
        attributes: [
          "id",
          "name",
          "color",
          "greetingMessage",
          "filePath",
          "fileName"
        ],
        include: [{ model: QueueOption, as: "options" }]
      }
    ],
    order: [["queues", "name", "ASC"]]
  });

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  return whatsapp;
};

export default ShowWhatsAppService;
