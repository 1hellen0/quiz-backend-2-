'use strict';

module.exports = (sequelize, DataTypes) => {
  const ComiteAprobacion = sequelize.define('ComiteAprobacion', {
    id_comite: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_aprobacion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(25),
      allowNull: false
    }
  }, {
    tableName: 'ComiteAprobacion',
    freezeTableName: true,
    timestamps: false
  });

  ComiteAprobacion.associate = models => {
    ComiteAprobacion.belongsTo(models.AprobacionCompra, {
      as: 'aprobacion',
      foreignKey: 'id_aprobacion'
    });
    ComiteAprobacion.hasMany(models.IntegranteComite, {
      as: 'integrantes',
      foreignKey: 'id_comite'
    });
  };

  return ComiteAprobacion;
};
