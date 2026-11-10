'use strict';

module.exports = (sequelize, DataTypes) => {
  const IncidenciaTraslado = sequelize.define('IncidenciaTraslado', {
    id_incidencia: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    id_detalle_despacho: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_usuario_reporta: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    id_usuario_resuelve: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    tipo: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    cantidad_afectada: {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: false
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING(25),
      allowNull: false
    },
    fecha_reporte: {
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
    tableName: 'IncidenciaTraslado',
    freezeTableName: true,
    timestamps: false
  });

  IncidenciaTraslado.associate = models => {
    IncidenciaTraslado.belongsTo(models.DetalleDespachoTraslado, {
      as: 'detalleDespacho',
      foreignKey: 'id_detalle_despacho'
    });
    IncidenciaTraslado.belongsTo(models.Usuario, {
      as: 'usuarioReporta',
      foreignKey: 'id_usuario_reporta'
    });
    IncidenciaTraslado.belongsTo(models.Usuario, {
      as: 'usuarioResuelve',
      foreignKey: 'id_usuario_resuelve'
    });
    IncidenciaTraslado.hasOne(models.MovimientoInventario, {
      as: 'movimientoInventario',
      foreignKey: 'id_incidencia'
    });
  };

  return IncidenciaTraslado;
};
