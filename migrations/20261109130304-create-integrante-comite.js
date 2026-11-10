'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('IntegranteComite', {
      id_integrante: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_comite: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ComiteAprobacion',
          key: 'id_comite'
        }
      },
      id_usuario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Usuario',
          key: 'id_usuario'
        }
      }
    }, { engine: 'InnoDB' });

    await queryInterface.addConstraint('IntegranteComite', {
      fields: ['id_comite', 'id_usuario'],
      type: 'unique',
      name: 'IntegranteComite_id_comite_id_usuario_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('IntegranteComite');
  }
};
