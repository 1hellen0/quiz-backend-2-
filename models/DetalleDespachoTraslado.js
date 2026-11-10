'use strict';

module.exports = (sequelize, DataTypes) => {
  const DetalleDespachoTraslado = sequelize.define('DetalleDespachoTraslado', {
    id_detalle_despacho: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_despacho: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_detalle_traslado: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cantidad_despachada: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    }
  }, {
    tableName: 'DetalleDespachoTraslado',
    freezeTableName: true,
    timestamps: false,
    indexes: [{
      name: 'DetalleDespachoTraslado_id_despacho_id_detalle_traslado_unique',
      unique: true,
      fields: ['id_despacho', 'id_detalle_traslado']
    }]
  });

  DetalleDespachoTraslado.associate = models => {
    DetalleDespachoTraslado.belongsTo(models.DespachoTraslado, {
      as: 'despacho',
      foreignKey: 'id_despacho'
    });
    DetalleDespachoTraslado.belongsTo(models.DetalleTraslado, {
      as: 'detalleTraslado',
      foreignKey: 'id_detalle_traslado'
    });
    DetalleDespachoTraslado.hasMany(models.DetalleRecepcionTraslado, {
      as: 'detallesRecepcion',
      foreignKey: 'id_detalle_despacho'
    });
    DetalleDespachoTraslado.hasMany(models.IncidenciaTraslado, {
      as: 'incidencias',
      foreignKey: 'id_detalle_despacho'
    });
    DetalleDespachoTraslado.hasOne(models.MovimientoInventario, {
      as: 'movimientoInventario',
      foreignKey: 'id_detalle_despacho'
    });
  };

  return DetalleDespachoTraslado;
};
