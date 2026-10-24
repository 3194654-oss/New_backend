require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Configuración del Pool para MySQL Local
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'repuestos_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Comprobar la conexión local al arrancar
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión exitosa a MySQL Local.');
    connection.release();
  } catch (error) {
    console.error('❌ Error al conectar a MySQL Local:', error.message);
  }
})();

// Endpoint para probar el servidor
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API de Repuestos conectada localmente' });
});

// --- CLIENTES ---

app.get('/clientes', async (req, res) => {
  try {
    const [resultados] = await pool.query('SELECT * FROM clientes');
    res.json(resultados);
  } catch (err) {
    console.error('Error en GET /clientes:', err.message);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

app.post('/clientes', async (req, res) => {
  const { nombre, telefono } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

  try {
    const [resultado] = await pool.query(
      'INSERT INTO clientes (nombre, telefono) VALUES (?, ?)',
      [nombre, telefono]
    );
    res.status(201).json({ message: 'Cliente registrado con éxito', id: resultado.insertId });
  } catch (err) {
    console.error('Error en POST /clientes:', err.message);
    res.status(500).json({ error: 'Error al registrar cliente' });
  }
});

// --- REPUESTOS ---

app.get('/repuestos', async (req, res) => {
  try {
    const [resultados] = await pool.query('SELECT * FROM repuestos');
    res.json(resultados);
  } catch (err) {
    console.error('Error en GET /repuestos:', err.message);
    res.status(500).json({ error: 'Error al obtener repuestos' });
  }
});

app.post('/repuestos', async (req, res) => {
  const { nombre, precio } = req.body;
  if (!nombre || precio === undefined) {
    return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
  }

  try {
    const [resultado] = await pool.query(
      'INSERT INTO repuestos (nombre, precio) VALUES (?, ?)',
      [nombre, precio]
    );
    res.status(201).json({ message: 'Repuesto agregado con éxito', id: resultado.insertId });
  } catch (err) {
    console.error('Error en POST /repuestos:', err.message);
    res.status(500).json({ error: 'Error al agregar repuesto' });
  }
});

// --- VENTAS ---

app.get('/ventas', async (req, res) => {
  const sql = `
    SELECT v.id, c.nombre AS cliente, r.nombre AS repuesto,
           v.cantidad, v.fecha, r.precio, (v.cantidad * r.precio) AS total,
           v.cliente_id, v.repuesto_id
    FROM ventas v
    INNER JOIN clientes c ON v.cliente_id = c.id
    INNER JOIN repuestos r ON v.repuesto_id = r.id
    ORDER BY v.id DESC
  `;
  try {
    const [resultados] = await pool.query(sql);
    res.json(resultados);
  } catch (err) {
    console.error('Error en GET /ventas:', err.message);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

app.post('/ventas', async (req, res) => {
  const { cliente_id, repuesto_id, cantidad, fecha } = req.body;
  if (!cliente_id || !repuesto_id || !cantidad || !fecha) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const [resultado] = await pool.query(
      'INSERT INTO ventas (cliente_id, repuesto_id, cantidad, fecha) VALUES (?, ?, ?, ?)',
      [cliente_id, repuesto_id, cantidad, fecha]
    );
    res.status(201).json({ message: 'Venta registrada correctamente', id: resultado.insertId });
  } catch (err) {
    console.error('Error en POST /ventas:', err.message);
    res.status(500).json({ error: 'Error al registrar venta' });
  }
});

app.put('/ventas/:id', async (req, res) => {
  const { id } = req.params;
  const { cliente_id, repuesto_id, cantidad, fecha } = req.body;

  try {
    const [resultado] = await pool.query(
      'UPDATE ventas SET cliente_id=?, repuesto_id=?, cantidad=?, fecha=? WHERE id=?',
      [cliente_id, repuesto_id, cantidad, fecha, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: `No se encontró la venta con ID ${id}` });
    }

    res.json({ message: `Venta con ID ${id} actualizada` });
  } catch (err) {
    console.error('Error en PUT /ventas/:id:', err.message);
    res.status(500).json({ error: 'Error al actualizar venta' });
  }
});

app.delete('/ventas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [resultado] = await pool.query('DELETE FROM ventas WHERE id=?', [id]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: `No se encontró la venta con ID ${id}` });
    }

    res.json({ message: `Venta con ID ${id} eliminada` });
  } catch (err) {
    console.error('Error en DELETE /ventas/:id:', err.message);
    res.status(500).json({ error: 'Error al eliminar venta' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor local corriendo en http://localhost:${PORT}`);
});