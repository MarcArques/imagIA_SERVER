// Importar Sequelize
const { Sequelize, DataTypes } = require('sequelize');

// Connexió a la base de dades MySQL sense usuari ni contrasenya
const sequelize = new Sequelize('imagia3', 'imagia3user', 'im@gia31234', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false, // Desactiva el logging SQL si no ho necessites
});

// Model 'usuaris'
const Usuari = sequelize.define('Usuari', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true, 
  },
  telefon: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: { 

    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, {
  tableName: 'usuaris',
  freezeTableName: true,
  timestamps: false,
});

// Model 'peticions'
const Peticio = sequelize.define('Peticio', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true, // Defineix l'ID com a clau primària
  },
  prompt: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  imatges: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'peticions',
  freezeTableName: true,
  timestamps: false,
});

// Funció per sincronitzar les taules
async function syncDatabase() {
  try {
    // Verificar connexió
    await sequelize.authenticate();
    console.log('Connexió a la base de dades establerta amb èxit.');

    // Sincronitzar models i recrear les taules (elimina les dades existents)
    await sequelize.sync({ force: true }); 
    console.log('Models sincronitzats amb èxit.');
  } catch (error) {
    console.error('Error en la connexió o sincronització de la base de dades:', error);
  } finally {
    await sequelize.close();
  }
}

// Executar la sincronització de les taules
syncDatabase();
