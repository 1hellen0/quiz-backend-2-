'use strict';

const {
  selectRows,
  withTransaction,
  assertExactMatch,
  refuseAmbiguousUndo
} = require('../scripts/seedDataHelpers');

const registrationDate = '2026-11-09 00:00:00';
const users = [
  {
    nombre: 'Responsable simulado de Obras',
    correo: 'responsable.obras@example.invalid'
  },
  {
    nombre: 'Responsable simulado de Mantenimiento',
    correo: 'responsable.mantenimiento@example.invalid'
  },
  {
    nombre: 'Responsable simulado de Bodega Central',
    correo: 'responsable.bodega@example.invalid'
  }
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await withTransaction(queryInterface, async transaction => {
      for (const user of users) {
        const [existing] = await selectRows(
          queryInterface,
          Sequelize,
          `SELECT \`id_usuario\`, \`nombre\`, \`correo\`, \`cargo\`, \`activo\`,
                  DATE_FORMAT(\`fecha_registro\`, '%Y-%m-%d %H:%i:%s') AS \`fecha_registro\`
             FROM \`Usuario\`
            WHERE \`correo\` = :correo
            LIMIT 1`,
          { correo: user.correo },
          transaction
        );

        assertExactMatch(
          `user "${user.correo}"`,
          existing,
          row =>
            row.nombre === user.nombre &&
            row.correo === user.correo &&
            row.cargo === null &&
            Number(row.activo) === 1 &&
            row.fecha_registro === registrationDate
        );

        if (!existing) {
          await queryInterface.bulkInsert('Usuario', [{
            ...user,
            cargo: null,
            activo: true,
            fecha_registro: registrationDate
          }], { transaction });
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    const emails = users.map(user => user.correo);
    const rows = await selectRows(
      queryInterface,
      Sequelize,
      'SELECT `id_usuario`, `correo` FROM `Usuario` WHERE `correo` IN (:emails)',
      { emails }
    );
    refuseAmbiguousUndo('simulated users', rows);
  }
};
