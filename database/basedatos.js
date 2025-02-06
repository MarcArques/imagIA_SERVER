require('dotenv').config();

const { Sequelize, DataTypes } = require('sequelize');
console.log("Conectando a la base de datos:");
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_HOST:", process.env.DB_HOST);
const sequelize = new Sequelize(
  process.env.DB_NAME,     
  process.env.DB_USER,     
  process.env.DB_PASSWORD, 
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false, 
  }
);

const Usuari = sequelize.define('usuaris', {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true },

  telefon: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true },

  nickname: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true},

  email: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    unique: true },

  rol: { 
    type: DataTypes.STRING, 
    allowNull: false, 
    defaultValue: 'user' },

  password: { 
    type: DataTypes.STRING, 
    allowNull: false },

  apiToken: { 
    type: DataTypes.STRING, 
    allowNull: true },

  pla: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'free'},
}, { 
    timestamps: false,
    tableName: 'usuaris',
    freezeTableName: true
     });

const Peticio = sequelize.define('peticions', {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true },

  prompt: { 
    type: DataTypes.TEXT, 
    allowNull: false },

  imatges: { 
    type: DataTypes.STRING, 
    allowNull: false },

  model: { 
    type: DataTypes.STRING, 
    allowNull: false },

  usuariID: { 
    type: DataTypes.INTEGER, 
    allowNull: false, 
    references: { model: Usuari, key: 'id' } },
},{
  tableName: 'peticions',
  freezeTableName: true,
  timestamps: false
});

Usuari.hasMany(Peticio, { foreignKey: 'usuariID' });
Peticio.belongsTo(Usuari, { foreignKey: 'usuariID' });

module.exports = { sequelize, Usuari, Peticio };

