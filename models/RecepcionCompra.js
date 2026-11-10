'use strict';

module.exports = (sequelize, DataTypes) => {
  const RecepcionCompra = sequelize.define('RecepcionCompra', {
    id_recepcion_compra: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_version: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    fecha_recepcion: {
      type: DataTypes.DATE,
      allowNull: false
    },
    fecha_confirmacion: {
      type: DataTypes.DATE,
      allowNull: true
    },
    estado: {
      type: DataTypes.STRING(25),
      allowNull: false
    },
    observacion: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'RecepcionCompra',
    freezeTableName: true,
    timestamps: false
  });

  RecepcionCompra.associate = models => {
    RecepcionCompra.belongsTo(models.VersionOrdenCompra, {
      as: 'versionOrdenCompra',
      foreignKey: 'id_version'
    });
    RecepcionCompra.belongsTo(models.Usuario, {
      as: 'usuario',
      foreignKey: 'id_usuario'
    });
    RecepcionCompra.hasMany(models.DetalleRecepcionCompra, {
      as: 'detalles',
      foreignKey: 'id_recepcion_compra'
    });
  };

  return RecepcionCompra;
};
