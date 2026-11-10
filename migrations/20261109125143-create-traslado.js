'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Traslado', {
      id_traslado: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      codigo: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true
      },
      id_origen: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Ubicacion',
          key: 'id_ubicacion'
        }
      },
      id_destino: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Ubicacion',
          key: 'id_ubicacion'
        }
      },
      id_solicitante: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Usuario',
          key: 'id_usuario'
        }
      },
      fecha_solicitud: {
        type: Sequelize.DATE,
        allowNull: false
      },
      estado: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      motivo: {
        type: Sequelize.TEXT
      }
    }, { engine: 'InnoDB' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Traslado');
  }
};
