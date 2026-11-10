'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('HistorialParametrosInventario', {
      id_historial: {
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
      id_usuario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Usuario',
          key: 'id_usuario'
        }
      },
      fecha_cambio: {
        type: Sequelize.DATE,
        allowNull: false
      },
      valores_anteriores: {
        type: Sequelize.TEXT
      },
      valores_nuevos: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      motivo: {
        type: Sequelize.TEXT,
        allowNull: false
      }
    }, { engine: 'InnoDB' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('HistorialParametrosInventario');
  }
};
