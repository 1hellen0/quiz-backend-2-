'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UsuarioRol', {
      id_usuario_rol: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_usuario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Usuario',
          key: 'id_usuario'
        }
      },
      id_rol: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Rol',
          key: 'id_rol'
        }
      }
    }, { engine: 'InnoDB' });

    await queryInterface.addConstraint('UsuarioRol', {
      fields: ['id_usuario', 'id_rol'],
      type: 'unique',
      name: 'UsuarioRol_id_usuario_id_rol_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('UsuarioRol');
  }
};
