// Importar las librerías necesarias
const axios = require('axios');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Configuración del test
const API_URL = 'http://localhost:3000/api/analitzar-imatge';
const imagePath = path.resolve(__dirname, './descarga.png'); // Ajusta la ruta según tu proyecto

// Función para ejecutar el test
async function testAnalitzarImatge() {
  console.log('Iniciando test para /api/analitzar-imatge');

  // Leer la imagen y convertirla a Base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  try {
    // Datos de prueba
    const requestData = {
      prompt: 'Describe esta imagen',
      images: [base64Image], // Sustituir por una imagen válida en base64
      stream: false,
      model: 'llama3.2-vision:latest',
    };

    // Realizar la petición POST
    const response = await axios.post(API_URL, requestData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Verificar la respuesta
    assert.strictEqual(response.status, 200, 'El código de estado no es 200');
    assert.strictEqual(response.data.status, 'OK', 'El estado de la respuesta no es OK');
    assert.strictEqual(typeof response.data.data, 'object', 'La respuesta no contiene datos válidos');

    console.log('Test pasado: /api/analitzar-imatge respondió correctamente');
  } catch (error) {
    if (error.response) {
      console.error('Error en la respuesta del servidor:', error.response.data);
    } else {
      console.error('Error en la petición:', error.message);
    }
    process.exit(1);
  }
}

// Ejecutar el test
testAnalitzarImatge();