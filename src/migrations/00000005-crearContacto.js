'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('contacto', {
        id_contacto: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        grado: {
          type: Sequelize.STRING(150),
        },
        nombres: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        apellidos: {
          type: Sequelize.STRING(150),
          allowNull: false,
        },
        cargo: {
          type: Sequelize.STRING(250),
        },
        entidad: {
          type: Sequelize.STRING(250),
        },
        tipo_entidad: {
          type: Sequelize.STRING(250),
        },
        sigla: {
          type: Sequelize.STRING(80),
        },
        direccion: {
          type: Sequelize.TEXT,
        },
        telefono: {
          type: Sequelize.TEXT,
        },
        departamento: {
          type: Sequelize.STRING(50),
        },
        estado: {
          type: Sequelize.ENUM('ACTIVO', 'INACTIVO'),
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
        },
      }
    );
  },
  down: (queryInterface, Sequelize) => {},
};
