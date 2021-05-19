'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('virtual', {
      id_virtual: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      fid_usuario_titular: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      fid_usuario_virtual: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      // fecha_inicio: {
      //   type: Sequelize.DATE,
      //   allowNull: false,
      // },
      // fecha_fin: {
      //   type: Sequelize.DATE,
      // },
      estado: {
        type: Sequelize.ENUM('ACTIVO', 'INACTIVO'),
        defaultValue: 'ACTIVO',
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
