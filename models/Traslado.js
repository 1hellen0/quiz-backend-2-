'use strict';

module.exports = (sequelize, DataTypes) => {
  const Traslado = sequelize.define('Traslado', {
    id_traslado: {
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
    id_origen: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_destino: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_solicitante: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    fecha_solicitud: {
      type: DataTypes.DATE,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    motivo: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'Traslado',
    freezeTableName: true,
    timestamps: false
  });

  Traslado.associate = models => {
    Traslado.belongsTo(models.Ubicacion, {
      as: 'ubicacionOrigen',
      foreignKey: 'id_origen'
    });
    Traslado.belongsTo(models.Ubicacion, {
      as: 'ubicacionDestino',
      foreignKey: 'id_destino'
    });
    Traslado.belongsTo(models.Usuario, {
      as: 'solicitante',
      foreignKey: 'id_solicitante'
    });
    Traslado.hasMany(models.DetalleTraslado, {
      as: 'detalles',
      foreignKey: 'id_traslado'
    });
    Traslado.hasMany(models.DespachoTraslado, {
      as: 'despachos',
      foreignKey: 'id_traslado'
    });
  };

  return Traslado;
};
