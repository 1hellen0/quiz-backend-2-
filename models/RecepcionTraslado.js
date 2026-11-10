'use strict';

module.exports = (sequelize, DataTypes) => {
  const RecepcionTraslado = sequelize.define('RecepcionTraslado', {
    id_recepcion_traslado: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_despacho: {
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
    observacion: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'RecepcionTraslado',
    freezeTableName: true,
    timestamps: false
  });

  RecepcionTraslado.associate = models => {
    RecepcionTraslado.belongsTo(models.DespachoTraslado, {
      as: 'despacho',
      foreignKey: 'id_despacho'
    });
    RecepcionTraslado.belongsTo(models.Usuario, {
      as: 'responsableRecepcion',
      foreignKey: 'id_usuario'
    });
    RecepcionTraslado.hasMany(models.DetalleRecepcionTraslado, {
      as: 'detalles',
      foreignKey: 'id_recepcion_traslado'
    });
  };

  return RecepcionTraslado;
};
