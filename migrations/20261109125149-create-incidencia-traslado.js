'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('IncidenciaTraslado', {
      id_incidencia: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      id_detalle_despacho: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'DetalleDespachoTraslado',
          key: 'id_detalle_despacho'
        }
      },
      id_usuario_reporta: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Usuario',
          key: 'id_usuario'
        }
      },
      id_usuario_resuelve: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Usuario',
          key: 'id_usuario'
        }
      },
      tipo: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      cantidad_afectada: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false
      },
      descripcion: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      estado: {
        type: Sequelize.STRING(25),
        allowNull: false
      },
      fecha_reporte: {
        type: Sequelize.DATE,
        allowNull: false
      },
      fecha_resolucion: {
        type: Sequelize.DATE
      },
      resolucion: {
        type: Sequelize.TEXT
      }
    }, { engine: 'InnoDB' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('IncidenciaTraslado');
  }
};
