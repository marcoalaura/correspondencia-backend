'use strict';
const Menu = require('../models/seguridad/menu'); // '../models/Platform';
module.exports = {
  up: (queryInterface, Sequelize) => {
    const padre = {
      nombre: 'CATALOGOS',
      descripcion: 'Bandeja de catalogos',
      orden: 1,
      ruta: '',
      icono: 'folder',
      estado: 'ACTIVO',
      _fecha_creacion: new Date(),
      _fecha_modificacion: new Date(),
      _usuario_creacion: 1,
      _usuario_modificacion: 1,
    }
    return queryInterface.bulkInsert('menu', [padre], {})
    .then(() => queryInterface.sequelize.query(`SELECT id_menu from menu where nombre like '${padre.nombre}';`))
    .then(resp => {
      const menus = [
        {
          nombre: 'MIS CATALOGOS',
          descripcion: 'Bandeja de mis catalogos',
          orden: 1,
          ruta: 'catalogos',
          icono: 'folder',
          estado: 'ACTIVO',
          _fecha_creacion: new Date(),
          _fecha_modificacion: new Date(),
          _usuario_creacion: 1,
          _usuario_modificacion: 1,
          fid_menu_padre: resp[0][0].id_menu,
        },
        {
          nombre: 'COMPARTIDOS',
          descripcion: 'Bandeja de catalogos compartidos',
          orden: 1,
          ruta: 'compartidos',
          icono: 'user',
          estado: 'ACTIVO',
          _fecha_creacion: new Date(),
          _fecha_modificacion: new Date(),
          _usuario_creacion: 1,
          _usuario_modificacion: 1,
          fid_menu_padre: resp[0][0].id_menu,
        },
      ]
      return queryInterface.bulkInsert('menu', menus, {});
    });
  },
  down: (queryInterface, Sequelize) => {},
};
