'use strict';

module.exports = (sequelize, DataTypes) => {
  const Proveedor = sequelize.define('Proveedor', {
    id_proveedor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    identificacion: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true
    },
    correo: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    telefono: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'Proveedor',
    freezeTableName: true,
    timestamps: false
  });

  Proveedor.associate = models => {
    Proveedor.hasMany(models.Cotizacion, {
      as: 'cotizaciones',
      foreignKey: 'id_proveedor'
    });
  };

  return Proveedor;
};
