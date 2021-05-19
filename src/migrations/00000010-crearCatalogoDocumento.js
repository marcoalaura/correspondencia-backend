'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('catalogo_documento', {
      id_catalogo_documento: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      fid_catalogo: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'catalogo',
          key: 'id_catalogo',
        },
      },
      fid_documento: {
        type: Sequelize.INTEGER,
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
