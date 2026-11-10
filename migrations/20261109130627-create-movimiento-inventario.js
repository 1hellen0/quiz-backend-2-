'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('MovimientoInventario', {
      id_movimiento: {
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
      id_ubicacion_origen: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Ubicacion',
          key: 'id_ubicacion'
        }
      },
      id_ubicacion_destino: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Ubicacion',
          key: 'id_ubicacion'
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
      tipo: {
        type: Sequelize.STRING(35),
        allowNull: false
      },
      cantidad: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false
      },
      fecha_movimiento: {
        type: Sequelize.DATE,
        allowNull: false
      },
      documento_apertura: {
        type: Sequelize.STRING(80)
      },
      id_detalle_entrega_vale: {
        type: Sequelize.INTEGER,
        unique: true,
        references: {
          model: 'DetalleEntregaVale',
          key: 'id_detalle_entrega'
        }
      },
      id_detalle_despacho: {
        type: Sequelize.INTEGER,
        unique: true,
        references: {
          model: 'DetalleDespachoTraslado',
          key: 'id_detalle_despacho'
        }
      },
      id_detalle_recepcion_traslado: {
        type: Sequelize.INTEGER,
        unique: true,
        references: {
          model: 'DetalleRecepcionTraslado',
          key: 'id_detalle_recepcion_traslado'
        }
      },
      id_detalle_recepcion_compra: {
        type: Sequelize.INTEGER,
        unique: true,
        references: {
          model: 'DetalleRecepcionCompra',
          key: 'id_detalle_recepcion_compra'
        }
      },
      id_decision_ajuste: {
        type: Sequelize.INTEGER,
        unique: true,
        references: {
          model: 'DecisionAjuste',
          key: 'id_decision_ajuste'
        }
      },
      id_decision_correccion: {
        type: Sequelize.INTEGER,
        unique: true,
        references: {
          model: 'DecisionCorreccionRecepcion',
          key: 'id_decision_correccion'
        }
      },
      id_incidencia: {
        type: Sequelize.INTEGER,
        unique: true,
        references: {
          model: 'IncidenciaTraslado',
          key: 'id_incidencia'
        }
      },
      observacion: {
        type: Sequelize.TEXT
      }
    }, { engine: 'InnoDB' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('MovimientoInventario');
  }
};
