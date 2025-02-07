require('dotenv').config(); 
const axios = require('axios');
const express = require('express');
const { Usuari, sequelize, Log } = require('../database/basedatos');
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
    const transaction = await sequelize.transaction(); // Iniciar transacción
    try {
        const { telefon, nickname, email } = req.body;

        if (!telefon || !nickname || !email) {
            await Log.create({ tag: "USUARIS_REGISTRATS", message: "Faltan parámetros en el registro", timestamp: new Date() }, { transaction });
            await transaction.commit();
            return res.status(400).json({ status: 'ERROR', message: 'Faltan parámetros obligatorios' });
        }

        const usuarioExistente = await Usuari.findOne({ where: { telefon } });

        if (usuarioExistente) {
            await Log.create({ tag: "USUARIS_REGISTRATS", message: `Registro fallido: usuario ${telefon} ya existe`, timestamp: new Date() }, { transaction });
            await transaction.commit();
            return res.status(400).json({ status: 'ERROR', message: 'El usuario ya está registrado' });
        }

        // Generar código de validación y guardarlo en memoria temporal
        const codi_validacio = generarCodigoValidacion();
        codigoVerificacionTemporal[telefon] = codi_validacio;

        // Intentar enviar SMS
        const smsURL = `http://192.168.1.16:8000/api/sendsms/`;
        const smsParams = { 
            api_token: process.env.SMS_API_TOKEN,
            username: process.env.SMS_USERNAME,   
            receiver: telefon,
            text: `Tu código de verificación es: ${codi_validacio}`,
        };

        try {
            await axios.get(smsURL, { params: smsParams });
            await Log.create({ tag: "USUARIS_REGISTRATS", message: `SMS enviado a ${telefon}`, timestamp: new Date() }, { transaction });
        } catch (smsError) {
            await Log.create({ tag: "USUARIS_REGISTRATS", message: `Error al enviar SMS a ${telefon}: ${smsError.message}`, timestamp: new Date() }, { transaction });
        }

        // Crear usuario en la base de datos
        await Usuari.create({
            telefon,
            nickname,
            email,
            rol: 'user',
            password: '',
            pla: 'free',
            apiToken: null,
        }, { transaction });

        await Log.create({ tag: "USUARIS_REGISTRATS", message: `Usuario ${telefon} registrado exitosamente`, timestamp: new Date() }, { transaction });

        await transaction.commit();
        res.json({ status: 'OK', message: 'Usuario registrado correctamente. Verifique su teléfono con el código recibido.' });

    } catch (error) {
        await transaction.rollback();
        console.error('Error en /api/usuaris/registrar:', error.message);
        await Log.create({ tag: "USUARIS_REGISTRATS", message: `Error en registro: ${error.message}`, timestamp: new Date() });
        res.status(500).json({ status: 'ERROR', message: 'Error interno del servidor' });
    }
});

  

// **Validación de usuario**
app.post('/api/usuaris/validar', async (req, res) => {
    const transaction = await sequelize.transaction(); 
    try {
        const { telefon, codi_validacio } = req.body;

        if (!telefon || !codi_validacio) {
            await Log.create({ tag: "USUARIS_VALIDATS", message: "Faltan parámetros en la validación", timestamp: new Date() }, { transaction });
            await transaction.commit();
            return res.status(400).json({ status: 'ERROR', message: 'Faltan parámetros obligatorios' });
        }

        const usuario = await Usuari.findOne({ where: { telefon } });

        if (!usuario) {
            await Log.create({ tag: "USUARIS_VALIDATS", message: `Intento de validación fallido: usuario ${telefon} no encontrado`, timestamp: new Date() }, { transaction });
            await transaction.commit();
            return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado' });
        }

        if (codigoVerificacionTemporal[telefon] !== codi_validacio) {
            await Log.create({ tag: "USUARIS_VALIDATS", message: `Código incorrecto para ${telefon}`, timestamp: new Date() }, { transaction });
            await transaction.commit();
            return res.status(400).json({ status: 'ERROR', message: 'Código incorrecto' });
        }

        // Confirmación del código con el servicio SMS
        const smsConfirmURL = `http://192.168.1.16:8000/api/sendsms/`;
        const smsConfirmParams = { 
            api_token: process.env.SMS_API_TOKEN,
            username: process.env.SMS_USERNAME,   
            receiver: telefon,
            text: `Confirmación: Código ${codi_validacio} recibido correctamente.`,
        };

        try {
            const smsResponse = await axios.get(smsConfirmURL, { params: smsConfirmParams });
            const smsMessage = smsResponse.status === 200 
                ? `Confirmación SMS enviada a ${telefon}`
                : `Error en confirmación SMS para ${telefon}`;
            await Log.create({ tag: "USUARIS_VALIDATS", message: smsMessage, timestamp: new Date() }, { transaction });
        } catch (smsError) {
            await Log.create({ tag: "USUARIS_VALIDATS", message: `Fallo al enviar confirmación SMS a ${telefon}: ${smsError.message}`, timestamp: new Date() }, { transaction });
        }

        // Generar un nuevo token si la validación es correcta
        const nuevoApiToken = generarApiToken();
        usuario.apiToken = nuevoApiToken;
        await usuario.save({ transaction });

        await Log.create({ tag: "USUARIS_VALIDATS", message: `Usuario ${telefon} validado correctamente. API Token generado.`, timestamp: new Date() }, { transaction });

        delete codigoVerificacionTemporal[telefon]; 

        await transaction.commit();
        res.json({ status: 'OK', message: 'Usuario validado correctamente', apiToken: nuevoApiToken });

    } catch (error) {
        await transaction.rollback();
        console.error('Error en la validación:', error.message);
        await Log.create({ tag: "USUARIS_VALIDATS", message: `Error en validación: ${error.message}`, timestamp: new Date() });
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
    try {
        const { telefon, nickname, email, pla } = req.body;
        const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;

        if (!token) {
            await Log.create({ tag: "ADMIN_USUARIS_PLA", message: "Intento de actualización sin token", timestamp: new Date() });
            return res.status(401).json({ status: 'ERROR', message: 'No autorizado' });
        }

        const admin = await Usuari.findOne({ where: { apiToken: token, rol: 'admin' } });
        if (!admin) {
            await Log.create({ tag: "ADMIN_USUARIS_PLA", message: `Acceso denegado para token ${token}`, timestamp: new Date() });
            return res.status(403).json({ status: 'ERROR', message: 'Acceso denegado' });
        }

        let usuario = await Usuari.findOne({ where: { telefon } }) ||
                      await Usuari.findOne({ where: { nickname } }) ||
                      await Usuari.findOne({ where: { email } });

        if (!usuario) {
            await Log.create({ tag: "ADMIN_USUARIS_PLA", message: `Intento de actualización fallido: usuario no encontrado (${telefon || nickname || email})`, timestamp: new Date() });
            return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado' });
        }

        usuario.pla = pla;
        await usuario.save();

        await Log.create({
            tag: "ADMIN_USUARIS_PLA",
            message: `Plan actualizado: ${usuario.nickname} (${usuario.telefon}) → ${pla}`,
            timestamp: new Date()
        });

        res.json({ status: 'OK', message: 'Plan de usuario actualizado', data: usuario });

    } catch (error) {
        console.error('Error en la actualización del plan:', error.message);
        await Log.create({ tag: "ADMIN_USUARIS_PLA", message: `Error en actualización: ${error.message}`, timestamp: new Date() });
        res.status(500).json({ status: 'ERROR', message: 'Error interno del servidor' });
    }
});

app.get('/api/admin/usuaris/quota', async (req, res) => {
    const { telefon, nickname, email } = req.query;

    try {
        if (!telefon && !nickname && !email) {
            await Log.create({ tag: "ADMIN_QUOTA", message: "Intento de consulta sin parámetros", timestamp: new Date() });
            return res.status(400).json({ status: 'ERROR', message: 'Se requiere al menos un parámetro (telefon, nickname o email).' });
        }

        let usuario;
        if (telefon) {
            usuario = await Usuari.findOne({ where: { telefon } });
        } else if (nickname) {
            usuario = await Usuari.findOne({ where: { nickname } });
        } else if (email) {
            usuario = await Usuari.findOne({ where: { email } });
        }

        if (!usuario) {
            await Log.create({ tag: "ADMIN_QUOTA", message: `Consulta de cuota fallida: usuario no encontrado (params: telefon=${telefon}, nickname=${nickname}, email=${email})`, timestamp: new Date() });
            return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado' });
        }

        await Log.create({ tag: "ADMIN_QUOTA", message: `Cuota obtenida para usuario ${usuario.telefon}`, timestamp: new Date() });

        res.json({ status: 'OK', message: 'Cuota obtenida correctamente', data: usuario.quota });

    } catch (error) {
        console.error('Error al obtener la cuota del usuario:', error);
        await Log.create({ tag: "ADMIN_QUOTA", message: `Error al obtener cuota: ${error.message}`, timestamp: new Date() });
        res.status(500).json({ status: 'ERROR', message: 'Error interno al obtener la cuota' });
    }
});


app.post('/api/admin/usuaris/quota/actualitzar', async (req, res) => {
    const transaction = await sequelize.transaction(); 

    try {
        const { telefon, nickname, email, limit, disponible } = req.body;
        const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;

        if (!token) {
            await Log.create({ tag: "ADMIN_QUOTA_UPDATE", message: "Intento de actualización sin autenticación", timestamp: new Date() }, { transaction });
            await transaction.commit();
            return res.status(401).json({ status: 'ERROR', message: 'No autorizado' });
        }

        const admin = await Usuari.findOne({ where: { apiToken: token, rol: 'admin' } });

        if (!admin) {
            await Log.create({ tag: "ADMIN_QUOTA_UPDATE", message: `Acceso denegado para el token ${token}`, timestamp: new Date() }, { transaction });
            await transaction.commit();
            return res.status(403).json({ status: 'ERROR', message: 'Acceso denegado' });
        }

        let usuario = await Usuari.findOne({ where: { telefon } }) ||
                      await Usuari.findOne({ where: { nickname } }) ||
                      await Usuari.findOne({ where: { email } });

        if (!usuario) {
            await Log.create({ tag: "ADMIN_QUOTA_UPDATE", message: `Intento de actualización fallido: usuario no encontrado (telefon=${telefon}, nickname=${nickname}, email=${email})`, timestamp: new Date() }, { transaction });
            await transaction.commit();
            return res.status(404).json({ status: 'ERROR', message: 'Usuario no encontrado' });
        }

        if (limit !== undefined) usuario.quotaTotal = limit;
        if (disponible !== undefined) usuario.quotaDisponible = disponible;

        await usuario.save({ transaction });

        await Log.create({ tag: "ADMIN_QUOTA_UPDATE", message: `Cuota actualizada para ${usuario.telefon} (limit=${limit}, disponible=${disponible})`, timestamp: new Date() }, { transaction });

        await transaction.commit();
        res.json({ status: 'OK', message: 'Cuota de usuario actualizada', data: usuario });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al actualizar la cuota del usuario:', error);
        await Log.create({ tag: "ADMIN_QUOTA_UPDATE", message: `Error en actualización de cuota: ${error.message}`, timestamp: new Date() });
        res.status(500).json({ status: 'ERROR', message: 'Error interno al actualizar la cuota' });
    }
});


// **Obtener lista de usuarios**
app.get('/api/admin/usuaris', async (req, res) => {
    const transaction = await sequelize.transaction(); 

    try {
        const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;

        if (!token) {
            await Log.create({ tag: "ADMIN_USUARIS_LIST", message: "Intento de acceso sin autenticación", timestamp: new Date() }, { transaction });
            await transaction.commit();
            return res.status(401).json({ status: 'ERROR', message: 'No autorizado' });
        }

        const admin = await Usuari.findOne({ where: { apiToken: token, rol: 'admin' } });

        if (!admin) {
            await Log.create({ tag: "ADMIN_USUARIS_LIST", message: `Acceso denegado para el token ${token}`, timestamp: new Date() }, { transaction });
            await transaction.commit();
            return res.status(403).json({ status: 'ERROR', message: 'Acceso denegado' });
        }

        const usuarios = await Usuari.findAll({
            attributes: ['id', 'telefon', 'nickname', 'email', 'pla']
        });

        await Log.create({ tag: "ADMIN_USUARIS_LIST", message: `Lista de usuarios obtenida por ${admin.telefon}`, timestamp: new Date() }, { transaction });

        await transaction.commit();
        res.json({ status: 'OK', message: 'Lista de usuarios obtenida', data: usuarios });

    } catch (error) {
        await transaction.rollback();
        console.error('Error en /api/admin/usuaris:', error.message);
        await Log.create({ tag: "ADMIN_USUARIS_LIST", message: `Error al obtener lista de usuarios: ${error.message}`, timestamp: new Date() });
        res.status(500).json({ status: 'ERROR', message: 'Error interno del servidor' });
    }
});


// **Login de administrador**
app.post('/api/admin/usuaris/login', async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { email, contrasenya } = req.body;

        if (!email || !contrasenya) {
            await Log.create({ tag: "ADMIN_LOGIN", message: "Intento de login sin parámetros obligatorios", timestamp: new Date() }, { transaction });
            await transaction.commit();
            return res.status(400).json({ status: 'ERROR', message: 'Faltan parámetros obligatorios' });
        }

        const admin = await Usuari.findOne({ where: { email, password: contrasenya, rol: 'admin' } });

        if (!admin) {
            await Log.create({ tag: "ADMIN_LOGIN", message: `Intento de login fallido para ${email}`, timestamp: new Date() }, { transaction });
            await transaction.commit();
            return res.status(403).json({ status: 'ERROR', message: 'Acceso denegado' });
        }

        await Log.create({ tag: "ADMIN_LOGIN", message: `Inicio de sesión exitoso para ${email}`, timestamp: new Date() }, { transaction });

        await transaction.commit();
        res.json({ status: 'OK', message: 'Inicio de sesión exitoso', apiToken: admin.apiToken });

    } catch (error) {
        await transaction.rollback();
        console.error('Error en /api/admin/usuaris/login:', error.message);
        await Log.create({ tag: "ADMIN_LOGIN", message: `Error en autenticación: ${error.message}`, timestamp: new Date() });
        res.status(500).json({ status: 'ERROR', message: 'Error interno del servidor' });
    }
});

app.get('/api/admin/logs', async (req, res) => {
    try {
        const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;

        if (!token) {
            return res.status(401).json({ status: 'ERROR', message: 'No autorizado' });
        }

        const admin = await Usuari.findOne({ where: { apiToken: token, rol: 'admin' } });
        if (!admin) {
            return res.status(403).json({ status: 'ERROR', message: 'Acceso denegado' });
        }

        const { contenido, tag } = req.query;
        let whereClause = {};

        if (contenido) {
            whereClause.mensaje = { [Op.like]: `%${contenido}%` };
        }

        if (tag) {
            whereClause.tag = tag;
        }

        const logs = await Log.findAll({
            where: whereClause,
            order: [['timestamp', 'DESC']] 
        });

        res.json({ status: 'OK', message: 'Logs obtenidos correctamente', data: logs });
    } catch (error) {
        console.error('Error en /api/admin/logs:', error.message);
        res.status(500).json({ status: 'ERROR', message: 'Error interno del servidor' });
    }
});


app.post('/api/analitzar-imatge', async (req, res) => {
    const transaction = await sequelize.transaction(); 

    try {
        const { prompt, images, stream, model } = req.body;

        await Log.create({ tag: "ANALISI_IMATGE", message: `Solicitud recibida para análisis de imagen`, timestamp: new Date() }, { transaction });

        if (!prompt || !images || !Array.isArray(images) || images.length === 0 || !model) {
            await Log.create({ tag: "ANALISI_IMATGE", message: `Faltan parámetros en la petición`, timestamp: new Date() }, { transaction });
            await transaction.commit();
            return res.status(400).json({
                status: 'ERROR',
                message: 'Faltan parámetros obligatorios en la petición',
            });
        }

        const response = await axios.post('http://192.168.1.14:11434/api/generate', {
            model,
            prompt,
            images,
            stream,
        });

        const ollamaPrompt = response.data.prompt || 'No se encontró el prompt en la respuesta de Ollama.';

        const nuevaPeticio = await Peticio.create({
            prompt,
            imatges: JSON.stringify(images),
            model,
            usuariID: req.usuario.id,
        }, { transaction });

        await Log.create({ tag: "ANALISI_IMATGE", message: `Imagen procesada correctamente y almacenada en BD. ID: ${nuevaPeticio.id}`, timestamp: new Date() }, { transaction });

        await transaction.commit();
        res.json({
            status: 'OK',
            message: 'Imagen procesada correctamente',
            prompt: ollamaPrompt,
            data: response.data,
            savedPromptId: nuevaPeticio.id 
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error al procesar la imagen:', error.response && error.response.data ? error.response.data : error.message);
        await Log.create({ tag: "ANALISI_IMATGE", message: `Error en análisis de imagen: ${error.message}`, timestamp: new Date() });
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

