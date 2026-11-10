'use strict';

const {
  selectRows,
  withTransaction,
  refuseAmbiguousUndo
} = require('../scripts/seedDataHelpers');

const assignments = [
  {
    correo: 'responsable.obras@example.invalid',
    roleName: 'Encargado de Obras'
  },
  {
    correo: 'responsable.mantenimiento@example.invalid',
    roleName: 'Encargado de Mantenimiento'
  },
  {
    correo: 'responsable.bodega@example.invalid',
    roleName: 'Encargado de Bodega'
  }
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await withTransaction(queryInterface, async transaction => {
      for (const assignment of assignments) {
        const [user] = await selectRows(
          queryInterface,
          Sequelize,
          'SELECT `id_usuario`, `correo` FROM `Usuario` WHERE `correo` = :correo LIMIT 1',
          { correo: assignment.correo },
          transaction
        );
        const [role] = await selectRows(
          queryInterface,
          Sequelize,
          'SELECT `id_rol`, `nombre` FROM `Rol` WHERE `nombre` = :nombre LIMIT 1',
          { nombre: assignment.roleName },
          transaction
        );

        if (!user || user.correo !== assignment.correo) {
          throw new Error(`Required user "${assignment.correo}" is missing or incompatible.`);
        }
        if (!role || role.nombre !== assignment.roleName) {
          throw new Error(`Required role "${assignment.roleName}" is missing or incompatible.`);
        }

        const [existing] = await selectRows(
          queryInterface,
          Sequelize,
          'SELECT `id_usuario_rol`, `id_usuario`, `id_rol` FROM `UsuarioRol` WHERE `id_usuario` = :id_usuario AND `id_rol` = :id_rol LIMIT 1',
          { id_usuario: user.id_usuario, id_rol: role.id_rol },
          transaction
        );

        if (!existing) {
          await queryInterface.bulkInsert('UsuarioRol', [{
            id_usuario: user.id_usuario,
            id_rol: role.id_rol
          }], { transaction });
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    const conditions = assignments.map((_, index) =>
      `(u.\`correo\` = :correo${index} AND r.\`nombre\` = :role${index})`
    );
    const replacements = {};
    assignments.forEach((assignment, index) => {
      replacements[`correo${index}`] = assignment.correo;
      replacements[`role${index}`] = assignment.roleName;
    });
    const rows = await selectRows(
      queryInterface,
      Sequelize,
      `SELECT ur.\`id_usuario_rol\`
         FROM \`UsuarioRol\` ur
         JOIN \`Usuario\` u ON u.\`id_usuario\` = ur.\`id_usuario\`
         JOIN \`Rol\` r ON r.\`id_rol\` = ur.\`id_rol\`
        WHERE ${conditions.join(' OR ')}`,
      replacements
    );
    refuseAmbiguousUndo('approved user-role assignments', rows);
  }
};
