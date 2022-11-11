import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Queues", "fileType", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: ""
      }),
      queryInterface.addColumn("Queues", "fileName", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: ""
      }),
      queryInterface.addColumn("Queues", "filePath", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: ""
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Queues", "fileType"),
      queryInterface.removeColumn("Queues", "fileName"),
      queryInterface.removeColumn("Queues", "filePath")
    ]);
  }
};
