// Microservicio de Clientes - administra los clientes de la tienda virtual
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;

// Almacenamiento en memoria (en un sistema real: base de datos propia del servicio)
const clientes = [
  { id: 1, nombre: 'Ana Gómez', documento: '1012345678', email: 'ana.gomez@correo.com', telefono: '3001234567' }
];
let siguienteId = clientes.length + 1;

app.get('/health', (req, res) => {
  res.json({ servicio: 'clientes', estado: 'activo' });
});

// Consultar todos los clientes
app.get('/clientes', (req, res) => {
  res.json(clientes);
});

// Consultar un cliente por id
app.get('/clientes/:id', (req, res) => {
  const cliente = clientes.find(c => c.id === Number(req.params.id));
  if (!cliente) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }
  res.json(cliente);
});

// Registrar un cliente
app.post('/clientes', (req, res) => {
  const { nombre, documento, email, telefono } = req.body;

  if (!nombre || !documento || !email) {
    return res.status(400).json({ error: 'Campos requeridos: nombre, documento, email' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'El email no tiene un formato válido' });
  }
  if (clientes.some(c => c.documento === documento || c.email === email)) {
    return res.status(409).json({ error: 'Ya existe un cliente con ese documento o email' });
  }

  const nuevo = { id: siguienteId++, nombre, documento, email, telefono: telefono || null };
  clientes.push(nuevo);
  res.status(201).json(nuevo);
});

app.listen(PORT, () => {
  console.log(`Servicio de Clientes escuchando en el puerto ${PORT}`);
});
