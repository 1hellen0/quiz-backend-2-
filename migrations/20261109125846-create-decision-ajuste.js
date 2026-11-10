'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DecisionAjuste', {
      id_decision_ajuste: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_solicitud_ajuste: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'SolicitudAjuste',
          key: 'id_solicitud_ajuste'
        }
      },
      id_administrador: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Usuario',
          key: 'id_usuario'
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('DecisionAjuste');
  }
};
