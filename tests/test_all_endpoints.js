const axios = require('axios');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://imagia3.ieti.site';
let userApiToken = 'efc104b72b4037a3b45d84f2752c2b9babe503ca80261f705e048ff31a83ea28'; // Reemplázalo con un token válido
let adminApiToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzM4MzQ2NTMwLCJleHAiOjE3Mzg0MzI5MzB9.iUk5UplnWAu0PQ6iMTNsRagH5j7pUPlvRGS6V3xAWzo';

const imagePath = path.resolve(__dirname, '../../img2.png');
const imageBuffer = fs.readFileSync(imagePath);
const base64Image = imageBuffer.toString('base64');

async function runTests() {
    try {
        console.log('🔍 Iniciando pruebas de la API...\n');
        console.log(base64Image);
        // 🟢 1. Analizar imagen (control de cuota)
        console.log('📌 Enviando imagen para análisis...');
        const imageAnalysisResponse = await axios.post(`${BASE_URL}/api/analitzar-imatge`, {
            prompt: "Test de imagen",
            images: [base64Image],
            stream: false,
            model: "llama3.2-vision"
        }, {
            headers: { Authorization: `Bearer ${userApiToken}` }
        });

        console.log('✅ Imagen analizada correctamente.');
        console.log('📄 Respuesta:', imageAnalysisResponse.data, '\n');

        // 🟢 2. Obtener historial de imágenes
        console.log('📌 Obteniendo historial de imágenes...');
        const historialResponse = await axios.get(`${BASE_URL}/api/usuaris/historial/prompts`, {
            headers: { Authorization: `Bearer ${userApiToken}` }
        });

        console.log('✅ Historial de imágenes obtenido correctamente.');
        console.log('📄 Respuesta:', historialResponse.data, '\n');

        console.log('🎉 TODAS LAS PRUEBAS PASARON CORRECTAMENTE');

    } catch (error) {
        console.error('❌ Error en la prueba:', error.response ? error.response.data : error.message);
    }
}

// Ejecutar el test
runTests();
