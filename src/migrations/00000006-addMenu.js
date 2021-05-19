'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    const contactos = [
      {
        nombre: 'CONTACTOS',
        descripcion: 'Bandeja de contactos',
        orden: 1,
        ruta: 'contactos',
        icono: 'user',
        estado: 'ACTIVO',
        _fecha_creacion: new Date(),
        _fecha_modificacion: new Date(),
        _usuario_creacion: 1,
        _usuario_modificacion: 1,
        fid_menu_padre: 1,
      },
    ];
    return queryInterface.bulkInsert('menu',  contactos, {});
  },
  down: (queryInterface, Sequelize) => {},
};
