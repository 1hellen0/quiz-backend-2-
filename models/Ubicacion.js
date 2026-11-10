'use strict';

module.exports = (sequelize, DataTypes) => {
  const Ubicacion = sequelize.define('Ubicacion', {
    id_ubicacion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    id_responsable: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'Ubicacion',
    freezeTableName: true,
    timestamps: false
  });

  Ubicacion.associate = models => {
    Ubicacion.belongsTo(models.Usuario, {
      as: 'responsable',
      foreignKey: 'id_responsable'
    });
    Ubicacion.hasMany(models.ParametrosInventario, {
      as: 'parametrosInventario',
      foreignKey: 'id_ubicacion'
    });
    Ubicacion.hasMany(models.ValeSalida, {
      as: 'valesSalida',
      foreignKey: 'id_ubicacion'
    });
    Ubicacion.hasMany(models.Traslado, {
      as: 'trasladosOrigen',
      foreignKey: 'id_origen'
    });
    Ubicacion.hasMany(models.Traslado, {
      as: 'trasladosDestino',
      foreignKey: 'id_destino'
    });
    Ubicacion.hasMany(models.SolicitudAjuste, {
      as: 'solicitudesAjuste',
      foreignKey: 'id_ubicacion'
    });
    Ubicacion.hasMany(models.VersionOrdenCompra, {
      as: 'versionesOrdenCompraDestino',
      foreignKey: 'id_ubicacion_destino'
    });
    Ubicacion.hasMany(models.MovimientoInventario, {
      as: 'movimientosInventarioOrigen',
      foreignKey: 'id_ubicacion_origen'
    });
    Ubicacion.hasMany(models.MovimientoInventario, {
      as: 'movimientosInventarioDestino',
      foreignKey: 'id_ubicacion_destino'
    });
  };

  return Ubicacion;
};
