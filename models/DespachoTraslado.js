'use strict';

module.exports = (sequelize, DataTypes) => {
  const DespachoTraslado = sequelize.define('DespachoTraslado', {
    id_despacho: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_traslado: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    fecha_despacho: {
      type: DataTypes.DATE,
      allowNull: false
    },
    observacion: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'DespachoTraslado',
    freezeTableName: true,
    timestamps: false
  });

  DespachoTraslado.associate = models => {
    DespachoTraslado.belongsTo(models.Traslado, {
      as: 'traslado',
      foreignKey: 'id_traslado'
    });
    DespachoTraslado.belongsTo(models.Usuario, {
      as: 'responsableDespacho',
      foreignKey: 'id_usuario'
    });
    DespachoTraslado.hasMany(models.DetalleDespachoTraslado, {
      as: 'detalles',
      foreignKey: 'id_despacho'
    });
    DespachoTraslado.hasMany(models.RecepcionTraslado, {
      as: 'recepciones',
      foreignKey: 'id_despacho'
    });
  };

  return DespachoTraslado;
};
