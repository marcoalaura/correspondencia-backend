'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query(`ALTER TYPE enum_historial_flujo_accion ADD VALUE 'ANULADO';`);
  },
  down: (queryInterface, Sequelize) => {}
};
