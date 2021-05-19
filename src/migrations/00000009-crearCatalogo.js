'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('catalogo', {
      id_catalogo: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nombre: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      estado: {
        type: Sequelize.ENUM('ACTIVO', 'INACTIVO', 'ELIMINADO'),
        allowNull: false,
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
