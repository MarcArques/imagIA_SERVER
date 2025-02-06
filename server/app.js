                                  
require('dotenv').config(); 
const axios = require('axios');
const express = require('express');
const { Usuari, sequelize } = require('../database/basedatos');
const app = express();
const crypto = require('crypto');
app.use(express.json());

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Conectado a MySQL correctamente.');
  } catch (error) {
    console.error('Error de conexión a la base de datos:', error);
  }
})();

//Función para generar un token seguro de 64 caracteres.
function generarApiToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Función para generar un código de validación de 6 dígitos
function generarCodigoValidacion() {
  return Math.floor(100000 + Math.random() * 900000).toString(); 
}

const codigoVerificacionTemporal = {};

const verificarToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({ status: 'ERROR', message: 'Token requerido' });
    }

    console.log(`Token recibido: ${token}`);

    const usuario = await Usuari.findOne({ where: { apiToken: token } });

    if (!usuario) {
      return res.status(403).json({ status: 'ERROR', message: 'Token inválido' });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    console.error('Error en la verificación del token:', error.message);
    return res.status(401).json({ status: 'ERROR', message: 'Token inválido' });
  }
};

// **Registro de usuario**
app.post('/api/usuaris/registrar', async (req, res) => {
  try {
    const { telefon, nickname, email } = req.body;

    if (!telefon || !nickname || !email) {
      return res.status(400).json({ status: 'ERROR', message: 'Faltan parámetros obligatorios' });
    }
  console.log("Petición registro recibida");

    const usuarioExistente = await Usuari.findOne({ where: { telefon } });
    if (usuarioExistente) {
      return res.status(400).json({ status: 'ERROR', message: 'El usuario ya está registrado' });
    }
  console.log("El usuario no existe");

    const codi_validacio = generarCodigoValidacion();
    console.log(`Código generado para ${telefon}: ${codi_validacio}`);

    // Guardar el código en memoria temporal
    codigoVerificacionTemporal[telefon] = codi_validacio;

    // Enviar SMS
    const smsURL = `http://192.168.1.16:8000/api/sendsms/`;
    const smsParams = { 
      api_token: process.env.SMS_API_TOKEN,
      username: process.env.SMS_USERNAME,   
      receiver: telefon,
      text: `Tu código de verificación es: ${codi_validacio}`,
    };

    try {
      await axios.get(smsURL, { params: smsParams });
      console.log('SMS enviado correctamente.');
    } catch (smsError) {
      console.error('Error al enviar el SMS:', smsError.message);
    }

    await Usuari.create({
      telefon,
      nickname,
      email,
      rol: 'user',
      password: '',
      pla: 'free',
      apiToken: null,
    });

    res.json({ status: 'OK', message: 'Usuario registrado correctamente. Verifique su teléfono con el código recibido.' });
  } catch (error) {
    console.error('Error en /api/usuaris/registrar:', error.message);
    res.status(500).json({ status: 'ERROR', message: 'Error interno del servidor' });
  }
});

// **Validación de usuario**
app.post('/api/usuaris/validar', async (req, res) => {
  try {
    const { telefon, codi_validacio } = req.body;

    if (!telefon || !codi_validacio) {
      return res.status(400).json({ status: 'ERROR', message: 'Faltan parámetros obligatorios' });
    }

    const usuario = await Usuari.findOne({ where: { telefon } });

    if (!usuario) {
      return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado' });
    }

    // Generar un nuevo token
    const nuevoApiToken = generarApiToken();
    usuario.apiToken = nuevoApiToken;

    await usuario.save(); // Guardar en la BD

    console.log(`Usuario validado: ${telefon}, Nuevo API Token: ${nuevoApiToken}`);

    res.json({ status: 'OK', message: 'Usuario validado correctamente', apiToken: nuevoApiToken });
  } catch (error) {
    console.error('Error en la validación:', error.message);
    res.status(500).json({ status: 'ERROR', message: 'Error interno del servidor' });
  }
});

// **Obtener perfil**
app.get('/api/usuaris/perfil', verificarToken, async (req, res) => {
  res.json({ status: 'OK', message: 'Perfil obtenido', data: req.usuario });
});

// **Consultar cuota**
app.get('/api/usuaris/quota', verificarToken, async (req, res) => {
  res.json({ status: 'OK', message: 'Cuota consultada', data: req.usuario.pla });
});

app.post('/api/admin/usuaris/pla/actualitzar', async (req, res) => {
    const { telefon, nickname, email, pla } = req.body;
    const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ status: 'ERROR', message: 'No autorizado' });
    }

    const admin = await Usuari.findOne({ where: { apiToken: token, rol: 'admin' } });
    if (!admin) {
        return res.status(403).json({ status: 'ERROR', message: 'Acceso denegado' });
    }

    let usuario = await Usuari.findOne({ where: { telefon } }) ||
                  await Usuari.findOne({ where: { nickname } }) ||
                  await Usuari.findOne({ where: { email } });

    if (!usuario) {
        return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado' });
    }

    usuario.pla = pla;
    await usuario.save();

    res.json({ status: 'OK', message: 'Plan de usuario actualizado', data: usuario });
});

app.get('/api/admin/usuaris/quota', async (req, res) => {
  const { telefon, nickname, email } = req.query;

  try {
    let usuario;
    if (telefon) {
      usuario = await Usuari.findOne({ where: { telefon } });
    } else if (nickname) {
      usuario = await Usuari.findOne({ where: { nickname } });
    } else if (email) {
      usuario = await Usuari.findOne({ where: { email } });
    }

    if (!usuario) {
      return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado' });
    }

    res.json({ status: 'OK', message: 'Cuota obtenida correctamente', data: usuario.quota });
  } catch (error) {
    console.error('Error al obtener la cuota del usuario:', error);
    res.status(500).json({ status: 'ERROR', message: 'Error interno al obtener la cuota' });
  }
});

app.post('/api/admin/usuaris/quota/actualitzar', async (req, res) => {
  const { telefon, nickname, email, limit, disponible } = req.body;
  const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;

  if (!token) {
      return res.status(401).json({ status: 'ERROR', message: 'No autorizado' });
  }

  const admin = await Usuari.findOne({ where: { apiToken: token, rol: 'admin' } });
  if (!admin) {
      return res.status(403).json({ status: 'ERROR', message: 'Acceso denegado' });
  }

  let usuario = await Usuari.findOne({ where: { telefon } }) ||
                await Usuari.findOne({ where: { nickname } }) ||
                await Usuari.findOne({ where: { email } });

  if (!usuario) {
      return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado' });
  }

  if (limit !== undefined) usuario.quotaTotal = limit;
  if (disponible !== undefined) usuario.quotaDisponible = disponible;

  await usuario.save();

  res.json({ status: 'OK', message: 'Cuota de usuario actualizada', data: usuario });
});

// **Obtener lista de usuarios**
app.get('/api/admin/usuaris', async (req, res) => {
  try {
    const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;

      if (!token) {
          return res.status(401).json({ status: 'ERROR', message: 'No autorizado' });
      }

      const admin = await Usuari.findOne({ where: { apiToken: token, rol: 'admin' } });
      if (!admin) {
          return res.status(403).json({ status: 'ERROR', message: 'Acceso denegado' });
      }

      const usuarios = await Usuari.findAll({
          attributes: ['id', 'telefon', 'nickname', 'email', 'pla']
      });

      res.json({ status: 'OK', message: 'Lista de usuarios obtenida', data: usuarios });
  } catch (error) {
      console.error('Error en /api/admin/usuaris:', error.message);
      res.status(500).json({ status: 'ERROR', message: 'Error interno del servidor' });
  }
});

// **Login de administrador**
app.post('/api/admin/usuaris/login', async (req, res) => {
  try {
    const { email, contrasenya } = req.body;

    if (!email || !contrasenya) {
      return res.status(400).json({ status: 'ERROR', message: 'Faltan parámetros obligatorios' });
    }

    const admin = await Usuari.findOne({ where: { email, password: contrasenya, rol: 'admin' } });

    if (!admin) {
      return res.status(403).json({ status: 'ERROR', message: 'Acceso denegado' });
    }

    res.json({ status: 'OK', message: 'Inicio de sesión exitoso', apiToken: admin.apiToken });
  } catch (error) {
    console.error('Error en /api/admin/usuaris/login:', error.message);
    res.status(500).json({ status: 'ERROR', message: 'Error interno del servidor' });
  }
});


app.post('/api/analitzar-imatge', async (req, res) => {
  console.log('Solicitud recibida en /api/analitzar-imatge:', req.body);

  const { prompt, images, stream, model } = req.body;

  if (!prompt || !images || !Array.isArray(images) || images.length === 0 || !model) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Faltan parámetros obligatorios en la petición',
    });
  }

  try {
    const response = await axios.post('http://192.168.1.14:11434/api/generate', {
      model,
      prompt,
      images,
      stream,
    });

    console.log('Respuesta de Ollama:', response.data);

    const ollamaPrompt = response.data.prompt || 'No se encontró el prompt en la respuesta de Ollama.';

    // Guardar en la base de datos en la tabla `peticions`
//    const nuevaPeticio = await Peticio.create({
//      prompt,
//      imatges: JSON.stringify(images),
//      model,
//      usuariID: req.usuario.id,
//    });

    res.json({
      status: 'OK',
      message: 'Imagen procesada correctamente',
      prompt: ollamaPrompt,
      data: response.data,
//      savedPromptId: nuevaPeticio.id 
    });

  } catch (error) {
    console.error('Error al procesar la imagen:', error.response && error.response.data ? error.response.data : error.message);
    res.status(500).json({
      status: 'ERROR',
      message: 'Error interno al procesar la imagen',
    });
  }
});
// **Iniciar el servidor**
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor en ejecución en el puerto ${PORT}`);
});

