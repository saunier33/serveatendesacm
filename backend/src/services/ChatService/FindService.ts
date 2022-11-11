import Chat from "../../models/Chat";
import User from "../../models/User";

type Params = {
  ownerId: number;
};

const FindService = async ({ ownerId }: Params): Promise<Chat[]> => {
  const chats: Chat[] = await Chat.findAll({
    where: {
      ownerId
    },
    include: [
      { model: User, as: "owner", attributes: ["id", "name"] }
    ],
    order: [["createdAt", "DESC"]]
  });

  return chats;
};

export default FindService;
