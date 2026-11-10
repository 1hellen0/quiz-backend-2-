'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DecisionCorreccionRecepcion', {
      id_decision_correccion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_solicitud_correccion: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'SolicitudCorreccionRecepcion',
          key: 'id_solicitud_correccion'
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
    await queryInterface.dropTable('DecisionCorreccionRecepcion');
  }
};
