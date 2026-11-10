'use strict';

module.exports = (sequelize, DataTypes) => {
  const RevisionCompra = sequelize.define('RevisionCompra', {
    id_revision: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_version_evaluada: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_revisor: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    tipo: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(25),
      allowNull: false
    },
    monto_acumulado: {
      type: DataTypes.DECIMAL(16, 2),
      allowNull: true
    },
    nivel_requerido: {
      type: DataTypes.STRING(35),
      allowNull: true
    },
    fecha_deteccion: {
      type: DataTypes.DATE,
      allowNull: false
    },
    fecha_resolucion: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolucion: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'RevisionCompra',
    freezeTableName: true,
    timestamps: false
  });

  RevisionCompra.associate = models => {
    RevisionCompra.belongsTo(models.VersionOrdenCompra, {
      as: 'versionEvaluada',
      foreignKey: 'id_version_evaluada'
    });
    RevisionCompra.belongsTo(models.Usuario, {
      as: 'revisor',
      foreignKey: 'id_revisor'
    });
    RevisionCompra.hasMany(models.OrdenRevisionCompra, {
      as: 'ordenesRelacionadas',
      foreignKey: 'id_revision'
    });
  };

  return RevisionCompra;
};
