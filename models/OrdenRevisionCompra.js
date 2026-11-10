'use strict';

module.exports = (sequelize, DataTypes) => {
  const OrdenRevisionCompra = sequelize.define('OrdenRevisionCompra', {
    id_orden_revision: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_revision: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_version_relacionada: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'OrdenRevisionCompra',
    freezeTableName: true,
    timestamps: false,
    indexes: [{
      name: 'OrdenRevisionCompra_id_revision_id_version_relacionada_unique',
      unique: true,
      fields: ['id_revision', 'id_version_relacionada']
    }]
  });

  OrdenRevisionCompra.associate = models => {
    OrdenRevisionCompra.belongsTo(models.RevisionCompra, {
      as: 'revision',
      foreignKey: 'id_revision'
    });
    OrdenRevisionCompra.belongsTo(models.VersionOrdenCompra, {
      as: 'versionRelacionada',
      foreignKey: 'id_version_relacionada'
    });
  };

  return OrdenRevisionCompra;
};
