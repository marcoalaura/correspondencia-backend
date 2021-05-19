'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    const users = [{
      fid_unidad: 1,
      usuario: 'sys_default',
      contrasena: '672caf27f5363dc833bda5099775e891',
      numero_documento: '1111111',
      nombres: 'system',
      apellidos: 'default ',
      cargo: 'Default system user',
      email: 'user@default.net',
      estado: 'ACTIVO',
      _fecha_creacion: new Date(),
      _fecha_modificacion: new Date(),
      _usuario_creacion: 1,
      _usuario_modificacion: 1
    }];

    return queryInterface.bulkInsert('usuario', users, {});
  },

  down: function (queryInterface, Sequelize) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.bulkDelete('Person', null, {});
    */
  }
};
