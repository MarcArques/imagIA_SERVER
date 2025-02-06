const axios = require('axios');
const readline = require('readline');

const BASE_URL = 'https://imagia3.ieti.site';
const adminApiToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzM4MzQ2NTMwLCJleHAiOjE3Mzg0MzI5MzB9.iUk5UplnWAu0PQ6iMTNsRagH5j7pUPlvRGS6V3xAWzo';
let userApiToken = '';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function registrarUsuario() {
    console.log('🔍 Registrando usuario de prueba...');
    const usuarioTest = {
        telefon: '683798999',
        nickname: 'test_user333333',
        email: 'test_user33333@example.com'
    };

    try {
        const response = await axios.post(`${BASE_URL}/api/usuaris/registrar`, usuarioTest);
        console.log('✅ Registro de usuario:', response.data);
        return usuarioTest;
    } catch (error) {
        console.error('❌ Error en el registro:', error.response ? error.response.data : error.message);
        rl.close();
        process.exit(1);
    }
}

async function validarUsuario(usuarioTest) {
    return new Promise((resolve) => {
        rl.question("Introduce el código de validación recibido por SMS: ", async (codigoUsuario) => {
            console.log(`📤 Validando usuario con código: ${codigoUsuario}...`);
            try {
                const validacionTest = {
                    telefon: usuarioTest.telefon,
                    codi_validacio: codigoUsuario
                };

                const response = await axios.post(`${BASE_URL}/api/usuaris/validar`, validacionTest);
                console.log('✅ Validación de usuario:', response.data);

                if (response.data.apiToken) {
                    userApiToken = response.data.apiToken;
                    console.log(`🔑 Token asignado: ${userApiToken}`);
                    resolve();
                } else {
                    throw new Error("No se recibió un API Token después de la validación.");
                }
            } catch (error) {
                console.error('❌ Error en la validación:', error.response ? error.response.data : error.message);
                rl.close();
                process.exit(1);
            }
        });
    });
}

async function ejecutarPruebas() {
    try {
        const usuarioTest = await registrarUsuario();
        await validarUsuario(usuarioTest);

        // **3. Obtener perfil**
        console.log('🔍 Obteniendo perfil...');
        let response = await axios.get(`${BASE_URL}/api/usuaris/perfil`, {
            headers: { Authorization: `Bearer ${userApiToken}` }
        });
        console.log('✅ Obtener perfil:', response.data);

        // **4. Consultar cuota**
        console.log('🔍 Consultando cuota...');
        response = await axios.get(`${BASE_URL}/api/usuaris/quota`, {
            headers: { Authorization: `Bearer ${userApiToken}` }
        });
        console.log('✅ Consultar cuota:', response.data);

        // **5. Listar usuarios (requiere admin)**
        console.log('🔍 Listando usuarios (admin)...');
        response = await axios.get(`${BASE_URL}/api/admin/usuaris`, {
            headers: { Authorization: `Bearer ${adminApiToken}` }
        });
        console.log('✅ Listar usuarios:', response.data);

        // **6. Actualizar plan de usuario**
        console.log('🔍 Actualizando plan de usuario...');
        const actualizarPlanTest = { telefon: usuarioTest.telefon, pla: 'premium' };
        response = await axios.post(`${BASE_URL}/api/admin/usuaris/pla/actualitzar`, actualizarPlanTest, {
            headers: { Authorization: `Bearer ${adminApiToken}` }
        });
        console.log('✅ Actualizar plan de usuario:', response.data);

        // **7. Consultar cuota por admin**
        console.log('🔍 Consultando cuota como admin...');
        response = await axios.get(`${BASE_URL}/api/admin/usuaris/quota`, {
            params: { telefon: usuarioTest.telefon },
            headers: { Authorization: `Bearer ${adminApiToken}` }
        });
        console.log('✅ Consultar cuota por admin:', response.data);

        // **8. Actualizar cuota**
        console.log('🔍 Actualizando cuota de usuario...');
        const actualizarCuotaTest = { telefon: usuarioTest.telefon, limit: 50, disponible: 30 };
        response = await axios.post(`${BASE_URL}/api/admin/usuaris/quota/actualitzar`, actualizarCuotaTest, {
            headers: { Authorization: `Bearer ${adminApiToken}` }
        });
        console.log('✅ Actualizar cuota:', response.data);

        // **9. Login de administrador**
        console.log('🔍 Haciendo login de administrador...');
        const loginAdminTest = { email: 'admin@admin.com', contrasenya: '1234' };
        response = await axios.post(`${BASE_URL}/api/admin/usuaris/login`, loginAdminTest);
        console.log('✅ Login de administrador:', response.data);

        console.log('🎉 TODAS LAS PRUEBAS PASARON CORRECTAMENTE');
    } catch (error) {
        console.error('❌ Error en la prueba:', error.response ? error.response.data : error.message);
    } finally {
        rl.close();
    }
}

// Ejecutar las pruebas
ejecutarPruebas();
