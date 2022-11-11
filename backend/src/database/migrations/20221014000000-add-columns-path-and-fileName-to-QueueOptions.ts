import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("QueueOptions", "optionType", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: ""
      }),
      queryInterface.addColumn("QueueOptions", "fileType", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: ""
      }),
      queryInterface.addColumn("QueueOptions", "fileName", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: ""
      }),
      queryInterface.addColumn("QueueOptions", "path", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: ""
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("QueueOptions", "fileType"),
      queryInterface.removeColumn("QueueOptions", "fileName"),
      queryInterface.removeColumn("QueueOptions", "path"),
      queryInterface.removeColumn("QueueOptions", "type")
    ]);
  }
};
