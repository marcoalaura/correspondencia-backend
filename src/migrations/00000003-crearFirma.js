'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('firma', {
      id_firma: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      fid_documento: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      hash: {
        type: Sequelize.TEXT
      },
      codigo: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      _usuario_creacion: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
       _usuario_modificacion: {
        type: Sequelize.INTEGER
      },
      _fecha_creacion: {
        type: Sequelize.DATE,
        allowNull: false
      },
      _fecha_modificacion: {
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {},
};
