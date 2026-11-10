'use strict';

module.exports = (sequelize, DataTypes) => {
  const VersionOrdenCompra = sequelize.define('VersionOrdenCompra', {
    id_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_orden: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    numero_version: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_ubicacion_destino: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_cotizacion_elegida: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    monto_total: {
      type: DataTypes.DECIMAL(16, 2),
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    fecha_version: {
      type: DataTypes.DATE,
      allowNull: false
    },
    motivo_version: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'VersionOrdenCompra',
    freezeTableName: true,
    timestamps: false,
    indexes: [{
      name: 'VersionOrdenCompra_id_orden_numero_version_unique',
      unique: true,
      fields: ['id_orden', 'numero_version']
    }]
  });

  VersionOrdenCompra.associate = models => {
    VersionOrdenCompra.belongsTo(models.OrdenCompra, {
      as: 'ordenCompra',
      foreignKey: 'id_orden'
    });
    VersionOrdenCompra.belongsTo(models.Ubicacion, {
      as: 'ubicacionDestino',
      foreignKey: 'id_ubicacion_destino'
    });
    VersionOrdenCompra.belongsTo(models.Cotizacion, {
      as: 'cotizacionElegida',
      foreignKey: 'id_cotizacion_elegida'
    });
    VersionOrdenCompra.hasOne(models.AprobacionCompra, {
      as: 'aprobacionCompra',
      foreignKey: 'id_version'
    });
    VersionOrdenCompra.hasMany(models.DetalleVersionOrdenCompra, {
      as: 'detalles',
      foreignKey: 'id_version'
    });
    VersionOrdenCompra.hasMany(models.Cotizacion, {
      as: 'cotizaciones',
      foreignKey: 'id_version'
    });
    VersionOrdenCompra.hasMany(models.RecepcionCompra, {
      as: 'recepcionesCompra',
      foreignKey: 'id_version'
    });
    VersionOrdenCompra.hasMany(models.RevisionCompra, {
      as: 'revisionesCompra',
      foreignKey: 'id_version_evaluada'
    });
    VersionOrdenCompra.hasMany(models.OrdenRevisionCompra, {
      as: 'ordenesRevisionRelacionadas',
      foreignKey: 'id_version_relacionada'
    });
  };

  return VersionOrdenCompra;
};
