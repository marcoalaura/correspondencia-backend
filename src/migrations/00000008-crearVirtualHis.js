'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('virtual_his', {
      id_virtual_his: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      fid_virtual: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      id_titular: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      id_virtual: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      accion: {
        type: Sequelize.ENUM('ACTIVO', 'INACTIVO'),
        defaultValue: 'ACTIVO',
      },
      _usuario_creacion: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      _usuario_modificacion: {
        type: Sequelize.INTEGER,
      },
      _fecha_creacion: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      _fecha_modificacion: {
        type: Sequelize.DATE,
      }
    });
  },
  down: (queryInterface, Sequelize) => {},
};
