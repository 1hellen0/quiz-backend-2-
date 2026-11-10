'use strict';

module.exports = (sequelize, DataTypes) => {
  const Usuario = sequelize.define('Usuario', {
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    nombre: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    correo: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    cargo: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    fecha_registro: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'Usuario',
    freezeTableName: true,
    timestamps: false
  });

  Usuario.associate = models => {
    Usuario.hasMany(models.UsuarioRol, {
      as: 'asignacionesRol',
      foreignKey: 'id_usuario'
    });
    Usuario.belongsToMany(models.Rol, {
      as: 'roles',
      through: models.UsuarioRol,
      foreignKey: 'id_usuario',
      otherKey: 'id_rol'
    });
    Usuario.hasMany(models.Ubicacion, {
      as: 'ubicacionesResponsable',
      foreignKey: 'id_responsable'
    });
    Usuario.hasMany(models.HistorialParametrosInventario, {
      as: 'historialParametrosInventario',
      foreignKey: 'id_usuario'
    });
    Usuario.hasMany(models.ValeSalida, {
      as: 'valesSolicitados',
      foreignKey: 'id_solicitante'
    });
    Usuario.hasMany(models.EntregaVale, {
      as: 'entregasRealizadas',
      foreignKey: 'id_usuario_entrega'
    });
    Usuario.hasMany(models.Traslado, {
      as: 'trasladosSolicitados',
      foreignKey: 'id_solicitante'
    });
    Usuario.hasMany(models.DespachoTraslado, {
      as: 'despachosResponsable',
      foreignKey: 'id_usuario'
    });
    Usuario.hasMany(models.RecepcionTraslado, {
      as: 'recepcionesResponsable',
      foreignKey: 'id_usuario'
    });
    Usuario.hasMany(models.IncidenciaTraslado, {
      as: 'incidenciasReportadas',
      foreignKey: 'id_usuario_reporta'
    });
    Usuario.hasMany(models.IncidenciaTraslado, {
      as: 'incidenciasResueltas',
      foreignKey: 'id_usuario_resuelve'
    });
    Usuario.hasMany(models.SolicitudAjuste, {
      as: 'solicitudesAjuste',
      foreignKey: 'id_solicitante'
    });
    Usuario.hasMany(models.DecisionAjuste, {
      as: 'decisionesAjusteAdministrador',
      foreignKey: 'id_administrador'
    });
    Usuario.hasMany(models.OrdenCompra, {
      as: 'ordenesCompraSolicitadas',
      foreignKey: 'id_solicitante'
    });
    Usuario.hasMany(models.DecisionAprobacionCompra, {
      as: 'decisionesAprobacionCompra',
      foreignKey: 'id_usuario'
    });
    Usuario.hasMany(models.IntegranteComite, {
      as: 'integrantesComite',
      foreignKey: 'id_usuario'
    });
    Usuario.hasMany(models.RecepcionCompra, {
      as: 'recepcionesCompra',
      foreignKey: 'id_usuario'
    });
    Usuario.hasMany(models.ConfiguracionControlCompra, {
      as: 'configuracionesControlCompra',
      foreignKey: 'id_usuario_actualiza'
    });
    Usuario.hasMany(models.RevisionCompra, {
      as: 'revisionesCompra',
      foreignKey: 'id_revisor'
    });
    Usuario.hasMany(models.SolicitudCorreccionRecepcion, {
      as: 'solicitudesCorreccionRecepcion',
      foreignKey: 'id_solicitante'
    });
    Usuario.hasMany(models.DecisionCorreccionRecepcion, {
      as: 'decisionesCorreccionRecepcionAdministrador',
      foreignKey: 'id_administrador'
    });
    Usuario.hasMany(models.MovimientoInventario, {
      as: 'movimientosInventario',
      foreignKey: 'id_usuario'
    });
  };

  return Usuario;
};
