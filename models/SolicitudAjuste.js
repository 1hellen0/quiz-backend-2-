'use strict';

module.exports = (sequelize, DataTypes) => {
  const SolicitudAjuste = sequelize.define('SolicitudAjuste', {
    id_solicitud_ajuste: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_material: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_ubicacion: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_solicitante: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cantidad_variacion: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    },
    motivo: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(25),
      allowNull: false
    },
    fecha_solicitud: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'SolicitudAjuste',
    freezeTableName: true,
    timestamps: false
  });

  SolicitudAjuste.associate = models => {
    SolicitudAjuste.belongsTo(models.Material, {
      as: 'material',
      foreignKey: 'id_material'
    });
    SolicitudAjuste.belongsTo(models.Ubicacion, {
      as: 'ubicacion',
      foreignKey: 'id_ubicacion'
    });
    SolicitudAjuste.belongsTo(models.Usuario, {
      as: 'solicitante',
      foreignKey: 'id_solicitante'
    });
    SolicitudAjuste.hasOne(models.DecisionAjuste, {
      as: 'decision',
      foreignKey: 'id_solicitud_ajuste'
    });
  };

  return SolicitudAjuste;
};
