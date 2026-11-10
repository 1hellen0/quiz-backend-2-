'use strict';

module.exports = (sequelize, DataTypes) => {
  const AprobacionCompra = sequelize.define('AprobacionCompra', {
    id_aprobacion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    nivel_requerido: {
      type: DataTypes.STRING(35),
      allowNull: false
    },
    cotizaciones_requeridas: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    monto_evaluado: {
      type: DataTypes.DECIMAL(16, 2),
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    fecha_solicitud: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'AprobacionCompra',
    freezeTableName: true,
    timestamps: false
  });

  AprobacionCompra.associate = models => {
    AprobacionCompra.belongsTo(models.VersionOrdenCompra, {
      as: 'versionOrdenCompra',
      foreignKey: 'id_version'
    });
    AprobacionCompra.hasMany(models.DecisionAprobacionCompra, {
      as: 'decisiones',
      foreignKey: 'id_aprobacion'
    });
    AprobacionCompra.hasOne(models.ComiteAprobacion, {
      as: 'comite',
      foreignKey: 'id_aprobacion'
    });
  };

  return AprobacionCompra;
};
