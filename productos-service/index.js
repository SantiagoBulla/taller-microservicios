// Microservicio de Productos - administra el catálogo de la tienda virtual
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Almacenamiento en memoria (en un sistema real: base de datos propia del servicio)
const productos = [
  { id: 1, nombre: 'Portátil Lenovo IdeaPad 5', categoria: 'Portátiles', precio: 2899000, stock: 15 },
  { id: 2, nombre: 'Mouse inalámbrico Logitech M185', categoria: 'Accesorios', precio: 59900, stock: 120 },
  { id: 3, nombre: 'Monitor Samsung 24"', categoria: 'Monitores', precio: 649000, stock: 30 }
];
let siguienteId = productos.length + 1;

// Verificación de estado del servicio
app.get('/health', (req, res) => {
  res.json({ servicio: 'productos', estado: 'activo' });
});

// Consultar todos los productos (permite filtrar por categoría: /productos?categoria=Monitores)
app.get('/productos', (req, res) => {
  const { categoria } = req.query;
  const resultado = categoria
    ? productos.filter(p => p.categoria.toLowerCase() === categoria.toLowerCase())
    : productos;
  res.json(resultado);
});

// Consultar un producto por id
app.get('/productos/:id', (req, res) => {
  const producto = productos.find(p => p.id === Number(req.params.id));
  if (!producto) {
    return res.status(404).json({ error: 'Producto no encontrado' });
  }
  res.json(producto);
});

// Registrar un producto
app.post('/productos', (req, res) => {
  const { nombre, categoria, precio, stock } = req.body;

  if (!nombre || !categoria || precio === undefined || stock === undefined) {
    return res.status(400).json({ error: 'Campos requeridos: nombre, categoria, precio, stock' });
  }
  if (typeof precio !== 'number' || precio <= 0) {
    return res.status(400).json({ error: 'El precio debe ser un número mayor que cero' });
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({ error: 'El stock debe ser un entero mayor o igual a cero' });
  }

  const nuevo = { id: siguienteId++, nombre, categoria, precio, stock };
  productos.push(nuevo);
  res.status(201).json(nuevo);
});

app.listen(PORT, () => {
  console.log(`Servicio de Productos escuchando en el puerto ${PORT}`);
});
