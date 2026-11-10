'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('EntregaVale', {
      id_entrega: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_vale: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ValeSalida',
          key: 'id_vale'
        }
      },
      id_usuario_entrega: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Usuario',
          key: 'id_usuario'
        }
      },
      fecha_entrega: {
        type: Sequelize.DATE,
        allowNull: false
      },
      observacion: {
        type: Sequelize.TEXT
      }
    }, { engine: 'InnoDB' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('EntregaVale');
  }
};
