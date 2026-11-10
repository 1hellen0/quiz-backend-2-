'use strict';

module.exports = (sequelize, DataTypes) => {
  const MovimientoInventario = sequelize.define('MovimientoInventario', {
    id_movimiento: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_material: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_ubicacion_origen: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    id_ubicacion_destino: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tipo: {
      type: DataTypes.STRING(35),
      allowNull: false
    },
    cantidad: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    },
    fecha_movimiento: {
      type: DataTypes.DATE,
      allowNull: false
    },
    documento_apertura: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    id_detalle_entrega_vale: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true
    },
    id_detalle_despacho: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true
    },
    id_detalle_recepcion_traslado: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true
    },
    id_detalle_recepcion_compra: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true
    },
    id_decision_ajuste: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true
    },
    id_decision_correccion: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true
    },
    id_incidencia: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true
    },
    observacion: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'MovimientoInventario',
    freezeTableName: true,
    timestamps: false
  });

  MovimientoInventario.associate = models => {
    MovimientoInventario.belongsTo(models.Material, {
      as: 'material',
      foreignKey: 'id_material'
    });
    MovimientoInventario.belongsTo(models.Ubicacion, {
      as: 'ubicacionOrigen',
      foreignKey: 'id_ubicacion_origen'
    });
    MovimientoInventario.belongsTo(models.Ubicacion, {
      as: 'ubicacionDestino',
      foreignKey: 'id_ubicacion_destino'
    });
    MovimientoInventario.belongsTo(models.Usuario, {
      as: 'usuario',
      foreignKey: 'id_usuario'
    });
    MovimientoInventario.belongsTo(models.DetalleEntregaVale, {
      as: 'detalleEntregaVale',
      foreignKey: 'id_detalle_entrega_vale'
    });
    MovimientoInventario.belongsTo(models.DetalleDespachoTraslado, {
      as: 'detalleDespachoTraslado',
      foreignKey: 'id_detalle_despacho'
    });
    MovimientoInventario.belongsTo(models.DetalleRecepcionTraslado, {
      as: 'detalleRecepcionTraslado',
      foreignKey: 'id_detalle_recepcion_traslado'
    });
    MovimientoInventario.belongsTo(models.DetalleRecepcionCompra, {
      as: 'detalleRecepcionCompra',
      foreignKey: 'id_detalle_recepcion_compra'
    });
    MovimientoInventario.belongsTo(models.DecisionAjuste, {
      as: 'decisionAjuste',
      foreignKey: 'id_decision_ajuste'
    });
    MovimientoInventario.belongsTo(models.DecisionCorreccionRecepcion, {
      as: 'decisionCorreccion',
      foreignKey: 'id_decision_correccion'
    });
    MovimientoInventario.belongsTo(models.IncidenciaTraslado, {
      as: 'incidenciaTraslado',
      foreignKey: 'id_incidencia'
    });
  };

  return MovimientoInventario;
};
