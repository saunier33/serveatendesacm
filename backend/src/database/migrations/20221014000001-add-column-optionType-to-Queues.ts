import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Queues", "optionType", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: ""
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([queryInterface.removeColumn("Queues", "optionType")]);
  }
};
