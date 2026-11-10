'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DecisionAprobacionCompra', {
      id_decision_compra: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_aprobacion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'AprobacionCompra',
          key: 'id_aprobacion'
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
      id_rol: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Rol',
          key: 'id_rol'
        }
      },
      decision: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      motivo: {
        type: Sequelize.TEXT
      },
      fecha_decision: {
        type: Sequelize.DATE,
        allowNull: false
      }
    }, { engine: 'InnoDB' });

    await queryInterface.addConstraint('DecisionAprobacionCompra', {
      fields: ['id_aprobacion', 'id_usuario'],
      type: 'unique',
      name: 'DecisionAprobacionCompra_id_aprobacion_id_usuario_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('DecisionAprobacionCompra');
  }
};
