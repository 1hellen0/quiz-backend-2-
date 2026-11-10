'use strict';

module.exports = (sequelize, DataTypes) => {
  const OrdenCompra = sequelize.define('OrdenCompra', {
    id_orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    codigo: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true
    },
    id_solicitante: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(30),
      allowNull: false
    }
  }, {
    tableName: 'OrdenCompra',
    freezeTableName: true,
    timestamps: false
  });

  OrdenCompra.associate = models => {
    OrdenCompra.belongsTo(models.Usuario, {
      as: 'solicitante',
      foreignKey: 'id_solicitante'
    });
    OrdenCompra.hasMany(models.VersionOrdenCompra, {
      as: 'versiones',
      foreignKey: 'id_orden'
    });
  };

  return OrdenCompra;
};
