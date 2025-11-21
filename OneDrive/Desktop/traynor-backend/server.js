// 1. Importar las herramientas
const express = require('express');
const mysql = require('mysql2'); // ¡Importamos la herramienta de MySQL!
const cors = require('cors');     // Importamos la herramienta de CORS
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // <-- AÑADE ESTA LÍNEA
const app = express();
const PORT = 3001;

// 2. Configurar la conexión a la base de datos
// ¡¡IMPORTANTE!! Reemplaza estos datos con los de tu base de datos.
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',       // ej: 'root'
  password: '', // ej: '12345'
  database: 'traynor_db'    // El nombre que le pusiste a tu base de datos
});
function verificarToken(req, res, next) {
  // 1. Buscamos el token en los encabezados de la petición
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

  if (token == null) {
    return res.sendStatus(401); // 401: No autorizado (no hay token)
  }

  const secretKey = 'tu_super_clave_secreta_para_jwt'; // La misma clave secreta

  // 2. Verificamos que el token sea válido
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.sendStatus(403); // 403: Prohibido (el token no es válido)
    }

    // 3. Si es válido, guardamos los datos del usuario en la petición y continuamos
    req.user = user;
    next(); // ¡Le damos paso para que continúe a la ruta protegida!
  });
}
// 3. Middlewares
// Son funciones que se ejecutan antes que nuestras rutas.
app.use(cors()); // Permite que React (que está en otro "dominio") se comunique con nuestra API.
app.use(express.json()); // Permite al servidor entender el formato JSON que enviaremos.

// 4. Definir la ruta para obtener los profesores (¡VERSIÓN MEJORADA!)
app.get('/api/profesores', (req, res) => {

  // 1. Capturamos el término de búsqueda de la URL (ej: ?buscar=yoga)
  // Si no hay nada, 'buscar' será undefined.
  const { buscar } = req.query;

  // 2. Preparamos la base de la consulta SQL
  let query = "SELECT * FROM profesores WHERE estado = 'aprobado'";
  const params = []; // Un array para los valores que irán en los '?'

  // 3. Si el usuario nos envió un término de búsqueda, modificamos la consulta
  if (buscar) {
    // Añadimos una condición para buscar en el nombre O en las especialidades
    query += " AND (nombre_completo LIKE ? OR especialidades LIKE ?)";
    // Añadimos el término de búsqueda (con comodines '%') a los parámetros
    params.push(`%${buscar}%`);
    params.push(`%${buscar}%`);
  }

  // 4. Ejecutamos la consulta (que ahora es dinámica)
  connection.query(query, params, (error, results) => {
    if (error) {
      console.error('Error al consultar la base de datos:', error);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }
    res.json(results);
  });
});

// Ruta para obtener UN SOLO profesor por su ID
app.get('/api/profesores/:id', (req, res) => {

  // 1. Capturamos el ID que viene en la URL.
  // ej: si la URL es /api/profesores/1, profesorId será '1'
  const profesorId = req.params.id;

  // 2. Creamos la consulta SQL para buscar por ID.
  // El '?' es un marcador de posición para evitar inyecciones SQL (más seguro).
  const query = 'SELECT * FROM profesores WHERE id = ?';

  // 3. Ejecutamos la consulta pasándole el ID.
  connection.query(query, [profesorId], (error, results) => {
    if (error) {
      console.error('Error al consultar la base de datos:', error);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }

    // 4. Verificamos si encontramos un profesor.
    if (results.length === 0) {
      // Si no hay resultados, devolvemos un error 404 (No Encontrado).
      return res.status(404).json({ message: 'Profesor no encontrado' });
    }

    // 5. Si todo sale bien, devolvemos el primer (y único) resultado.
    // Usamos results[0] para enviar el objeto directamente, no un array.
    res.json(results[0]);
  });
});
// --- AÑADE ESTE NUEVO BLOQUE DE CÓDIGO ---

// Ruta para registrar un nuevo profesor (POST)
app.post('/api/register', (req, res) => {
  // 1. Extraemos los datos del cuerpo de la petición
  const { nombre_completo, email, password } = req.body;

  // Verificación simple para asegurarnos de que tenemos los datos necesarios
  if (!nombre_completo || !email || !password) {
    return res.status(400).json({ message: 'Por favor, completa todos los campos.' });
  }

  // 2. "Hasheamos" la contraseña antes de guardarla
  // El '10' es el "costo" del hasheo, un valor estándar y seguro.
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error al hashear la contraseña:', err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }

    // 3. Creamos la consulta SQL para insertar el nuevo profesor
    const query = `
      INSERT INTO profesores 
      (nombre_completo, email, password, modalidad, estado) 
      VALUES (?, ?, ?, 'Online', 'pendiente')
    `;
    // Nota: Asignamos valores por defecto como 'Online' y 'pendiente'

    const params = [nombre_completo, email, hashedPassword];

    // 4. Ejecutamos la consulta
    connection.query(query, params, (error, results) => {
      if (error) {
        // Manejamos un error común: el email ya existe
        if (error.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'El correo electrónico ya está registrado.' });
        }
        console.error('Error al registrar el profesor:', error);
        return res.status(500).json({ error: 'Error al registrar en la base de datos.' });
      }

      // 5. Si todo sale bien, enviamos una respuesta de éxito
      res.status(201).json({ message: '¡Registro exitoso! Tu perfil está pendiente de aprobación.' });
    });
  });
});
// --- AÑADE ESTE NUEVO BLOQUE DE CÓDIGO ---

// Ruta para iniciar sesión (POST)
app.post('/api/login', (req, res) => {
  // 1. Extraemos email y password del cuerpo de la petición
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Por favor, introduce email y contraseña.' });
  }

  // 2. Buscamos al profesor en la base de datos por su email
  const query = 'SELECT * FROM profesores WHERE email = ?';
  connection.query(query, [email], (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Error en el servidor.' });
    }

    // 3. Si no encontramos al usuario, devolvemos un error
    if (results.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas.' }); // 401: No autorizado
    }

    const profesor = results[0];

    // 4. Comparamos la contraseña enviada con la contraseña "hasheada" de la BD
    bcrypt.compare(password, profesor.password, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ error: 'Error en el servidor.' });
      }

      if (!isMatch) {
        return res.status(401).json({ message: 'Credenciales inválidas.' });
      }

      // 5. ¡Si todo coincide, creamos el Token (la pulsera)!
      const payload = {
        id: profesor.id,
        nombre: profesor.nombre_completo,
        // Podríamos añadir un rol 'admin' aquí en el futuro
      };

      // Firmamos el token con una clave secreta. ¡Nunca compartas esta clave!
      const secretKey = 'tu_super_clave_secreta_para_jwt';
      const token = jwt.sign(payload, secretKey, { expiresIn: '1h' }); // El token expira en 1 hora

      // 6. Enviamos el token al cliente
      res.json({
        message: '¡Inicio de sesión exitoso!',
        token: token
      });
    });
  });
});
// --- AÑADE ESTA NUEVA RUTA PROTEGIDA ---

// Ruta para que el admin vea los profesores pendientes
// ¡Ojo! Añadimos 'verificarToken' en el medio. Ese es nuestro guardaespaldas.
app.get('/api/admin/pendientes', verificarToken, (req, res) => {

  // Gracias al middleware, ahora sabemos que quien hace esta petición está autenticado.
  // podríamos incluso verificar si req.user tiene un rol de 'admin' aquí.

  const query = "SELECT id, nombre_completo, email FROM profesores WHERE estado = 'pendiente'";

  connection.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Error en el servidor.' });
    }
    res.json(results);
  });
});
// --- AÑADE ESTA NUEVA RUTA PARA ACTUALIZAR ESTADOS ---

// Usamos PATCH porque solo vamos a modificar una parte del profesor (su estado)
app.patch('/api/admin/profesores/:id', verificarToken, (req, res) => {
  const { id } = req.params; // El ID del profesor a modificar
  const { nuevoEstado } = req.body; // El nuevo estado que enviaremos ('aprobado' o 'rechazado')

  // Una pequeña validación para seguridad
  if (nuevoEstado !== 'aprobado' && nuevoEstado !== 'rechazado') {
    return res.status(400).json({ message: 'El estado proporcionado no es válido.' });
  }

  const query = 'UPDATE profesores SET estado = ? WHERE id = ?';

  connection.query(query, [nuevoEstado, id], (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Error al actualizar el profesor.' });
    }
    // Verificamos si se afectó alguna fila
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Profesor no encontrado.' });
    }
    res.json({ message: `El estado del profesor ${id} ha sido actualizado a ${nuevoEstado}.` });
  });
});
// 5. Encender el servidor
app.listen(PORT, () => {
  console.log(`Servidor de Traynor escuchando en http://localhost:${PORT}`);
});