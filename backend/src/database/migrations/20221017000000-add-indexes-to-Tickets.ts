import { QueryInterface } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addIndex(
        "Tickets",
        ["whatsappId", "queueId", "userId", "contactId", "status"],
        {
          name: "Tickets_whatsapp_queue_user_contact_status_idx"
        }
      )
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeIndex(
        "Tickets",
        "Tickets_whatsapp_queue_user_contact_status_idx"
      )
    ]);
  }
};
