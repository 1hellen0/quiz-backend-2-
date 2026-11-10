'use strict';

const {
  selectRows,
  withTransaction,
  assertExactMatch,
  refuseAmbiguousUndo
} = require('../scripts/seedDataHelpers');

const locations = [
  {
    nombre: 'Obras',
    responsibleEmail: 'responsable.obras@example.invalid'
  },
  {
    nombre: 'Mantenimiento',
    responsibleEmail: 'responsable.mantenimiento@example.invalid'
  },
  {
    nombre: 'Bodega Central',
    responsibleEmail: 'responsable.bodega@example.invalid'
  }
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await withTransaction(queryInterface, async transaction => {
      for (const location of locations) {
        const [user] = await selectRows(
          queryInterface,
          Sequelize,
          'SELECT `id_usuario`, `correo` FROM `Usuario` WHERE `correo` = :correo LIMIT 1',
          { correo: location.responsibleEmail },
          transaction
        );

        if (!user || user.correo !== location.responsibleEmail) {
          throw new Error(
            `Required responsible "${location.responsibleEmail}" is missing or incompatible.`
          );
        }

        const [existing] = await selectRows(
          queryInterface,
          Sequelize,
          'SELECT `id_ubicacion`, `nombre`, `id_responsable`, `activo` FROM `Ubicacion` WHERE `nombre` = :nombre LIMIT 1',
          { nombre: location.nombre },
          transaction
        );

        assertExactMatch(
          `location "${location.nombre}"`,
          existing,
          row =>
            row.nombre === location.nombre &&
            Number(row.id_responsable) === Number(user.id_usuario) &&
            Number(row.activo) === 1
        );

        if (!existing) {
          await queryInterface.bulkInsert('Ubicacion', [{
            nombre: location.nombre,
            id_responsable: user.id_usuario,
            activo: true
          }], { transaction });
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    const names = locations.map(location => location.nombre);
    const rows = await selectRows(
      queryInterface,
      Sequelize,
      'SELECT `id_ubicacion`, `nombre`, `id_responsable` FROM `Ubicacion` WHERE `nombre` IN (:names)',
      { names }
    );
    refuseAmbiguousUndo('operational locations', rows);
  }
};
