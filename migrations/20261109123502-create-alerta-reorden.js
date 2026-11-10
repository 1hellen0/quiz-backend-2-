'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AlertaReorden', {
      id_alerta: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_parametros: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ParametrosInventario',
          key: 'id_parametros'
        }
      },
      estado: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      stock_detectado: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false
      },
      punto_reorden_detectado: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false
      },
      fecha_apertura: {
        type: Sequelize.DATE,
        allowNull: false
      },
      fecha_cierre: {
        type: Sequelize.DATE
      }
    }, { engine: 'InnoDB' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('AlertaReorden');
  }
};
