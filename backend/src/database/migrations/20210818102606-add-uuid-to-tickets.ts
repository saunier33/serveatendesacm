import { QueryInterface, DataTypes, Sequelize } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Tickets", "uuid", {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: Sequelize.literal('uuid()')
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Tickets", "uuid");
  }
};
