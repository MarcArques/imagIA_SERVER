const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('imagia3', 'imagia3user', 'im@gia31234', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false, 
});

// **Definición del modelo Usuari**
const Usuari = sequelize.define('usuaris', {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },

  nickname: {
    type: DataTypes.STRING,
    allowNull: false
  },

  telefon: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true 
  },

  email: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true,
    validate: {
      isEmail: true 
    }
  },

  rol: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    defaultValue: 'user' 
  },

  password: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },

  apiToken: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },

  pla: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    defaultValue: 'free' 
  },

  quotaTotal: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    defaultValue: 20 
  },

  quotaDisponible: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    defaultValue: 20 
  },

  ultimaActualizacionQuota: { 
    type: DataTypes.DATE, 
    allowNull: false, 
    defaultValue: Sequelize.NOW 
  }

}, { 
  tableName: 'usuaris',
  timestamps: false 
});

// **Definición del modelo Peticio**
const Peticio = sequelize.define('peticions', {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },

  prompt: { 
    type: DataTypes.TEXT, 
    allowNull: false 
  },

  createdAt: { 
    type: DataTypes.DATE, 
    allowNull: false, 
    defaultValue: Sequelize.NOW 
  },

  usuariID: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    references: { model: Usuari, key: 'id' } 
  },

  model: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },

}, { timestamps: false });

// **Definición del modelo Log**
const Log = sequelize.define('logs', {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },

  tag: { 
    type: DataTypes.STRING, 
    allowNull: false 
  }, 

  mensaje: { 
    type: DataTypes.TEXT, 
    allowNull: false 
  },

  timestamp: { 
    type: DataTypes.DATE, 
    allowNull: false, 
    defaultValue: Sequelize.NOW 
  }

}, { 
  tableName: 'logs',
  timestamps: false 
});

// **Relaciones**
Usuari.hasMany(Peticio, { foreignKey: 'usuariID', onDelete: 'CASCADE' });
Peticio.belongsTo(Usuari, { foreignKey: 'usuariID' });

module.exports = { sequelize, Usuari, Peticio, Log };
