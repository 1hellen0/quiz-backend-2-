'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SolicitudAjuste', {
      id_solicitud_ajuste: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_material: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Material',
          key: 'id_material'
        }
      },
      id_ubicacion: {
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
      cantidad_variacion: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false
      },
      motivo: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      estado: {
        type: Sequelize.STRING(25),
        allowNull: false
      },
      fecha_solicitud: {
        type: Sequelize.DATE,
        allowNull: false
      }
    }, { engine: 'InnoDB' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('SolicitudAjuste');
  }
};
