'use strict';

const {
  selectRows,
  withTransaction,
  assertExactMatch,
  refuseAmbiguousUndo
} = require('../scripts/seedDataHelpers');

const roleNames = [
  'Administrador',
  'Encargado de Bodega',
  'Encargado de Obras',
  'Encargado de Mantenimiento',
  'Supervisor'
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await withTransaction(queryInterface, async transaction => {
      for (const nombre of roleNames) {
        const [existing] = await selectRows(
          queryInterface,
          Sequelize,
          'SELECT `id_rol`, `nombre` FROM `Rol` WHERE `nombre` = :nombre LIMIT 1',
          { nombre },
          transaction
        );

        assertExactMatch(
          `role "${nombre}"`,
          existing,
          row => row.nombre === nombre
        );

        if (!existing) {
          await queryInterface.bulkInsert('Rol', [{ nombre }], { transaction });
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    const rows = await selectRows(
      queryInterface,
      Sequelize,
      'SELECT `id_rol`, `nombre` FROM `Rol` WHERE `nombre` IN (:names)',
      { names: roleNames }
    );
    refuseAmbiguousUndo('approved roles', rows);
  }
};
