// Microservicio de Pedidos - registra pedidos y permite consultar su estado
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3003;
// Direcciones de los servicios de los que depende (configurables por variables de entorno)
const PRODUCTOS_URL = process.env.PRODUCTOS_URL || 'http://localhost:3001';
const CLIENTES_URL = process.env.CLIENTES_URL || 'http://localhost:3002';
const TIEMPO_ESPERA_MS = 3000;

const ESTADOS = ['REGISTRADO', 'PAGADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];

// Almacenamiento en memoria (en un sistema real: base de datos propia del servicio)
const pedidos = [];
let siguienteId = 1;

// Llamada HTTP a otro servicio con tiempo de espera máximo.
// Devuelve el cuerpo JSON, null si el recurso no existe (404)
// o lanza un error si el servicio no responde.
async function consultarServicio(url) {
  const respuesta = await fetch(url, { signal: AbortSignal.timeout(TIEMPO_ESPERA_MS) });
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) throw new Error(`Respuesta ${respuesta.status} de ${url}`);
  return respuesta.json();
}

app.get('/health', (req, res) => {
  res.json({ servicio: 'pedidos', estado: 'activo' });
});

// Registrar un pedido
// Cuerpo esperado: { "clienteId": 1, "items": [ { "productoId": 2, "cantidad": 3 } ] }
app.post('/pedidos', async (req, res) => {
  const { clienteId, items } = req.body;

  if (!clienteId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se requiere clienteId y una lista de items no vacía' });
  }
  if (items.some(i => !i.productoId || !Number.isInteger(i.cantidad) || i.cantidad <= 0)) {
    return res.status(400).json({ error: 'Cada item requiere productoId y una cantidad entera positiva' });
  }

  // 1. Validar el cliente con el servicio de Clientes
  let cliente;
  try {
    cliente = await consultarServicio(`${CLIENTES_URL}/clientes/${clienteId}`);
  } catch (e) {
    return res.status(503).json({ error: 'El servicio de Clientes no está disponible. Intente más tarde.' });
  }
  if (!cliente) {
    return res.status(404).json({ error: `El cliente ${clienteId} no existe` });
  }

  // 2. Validar cada producto con el servicio de Productos y tomar su precio actual
  const detalle = [];
  for (const item of items) {
    let producto;
    try {
      producto = await consultarServicio(`${PRODUCTOS_URL}/productos/${item.productoId}`);
    } catch (e) {
      return res.status(503).json({
        error: 'El servicio de Productos no está disponible. No es posible registrar pedidos en este momento.'
      });
    }
    if (!producto) {
      return res.status(404).json({ error: `El producto ${item.productoId} no existe` });
    }
    if (producto.stock < item.cantidad) {
      return res.status(409).json({ error: `Stock insuficiente para ${producto.nombre} (disponible: ${producto.stock})` });
    }
    // Se guarda una copia del nombre y precio: el pedido no depende de cambios futuros del catálogo
    detalle.push({
      productoId: producto.id,
      nombre: producto.nombre,
      precioUnitario: producto.precio,
      cantidad: item.cantidad,
      subtotal: producto.precio * item.cantidad
    });
  }

  const pedido = {
    id: siguienteId++,
    clienteId: cliente.id,
    items: detalle,
    total: detalle.reduce((suma, d) => suma + d.subtotal, 0),
    estado: 'REGISTRADO',
    fecha: new Date().toISOString()
  };
  pedidos.push(pedido);
  res.status(201).json(pedido);
});

// Consultar todos los pedidos (permite filtrar por cliente: /pedidos?clienteId=1)
app.get('/pedidos', (req, res) => {
  const { clienteId } = req.query;
  const resultado = clienteId ? pedidos.filter(p => p.clienteId === Number(clienteId)) : pedidos;
  res.json(resultado);
});

// Consultar un pedido por id
app.get('/pedidos/:id', (req, res) => {
  const pedido = pedidos.find(p => p.id === Number(req.params.id));
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
  res.json(pedido);
});

// Consultar solo el estado de un pedido
app.get('/pedidos/:id/estado', (req, res) => {
  const pedido = pedidos.find(p => p.id === Number(req.params.id));
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
  res.json({ id: pedido.id, estado: pedido.estado });
});

// Actualizar el estado de un pedido
app.patch('/pedidos/:id/estado', (req, res) => {
  const pedido = pedidos.find(p => p.id === Number(req.params.id));
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

  const { estado } = req.body;
  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${ESTADOS.join(', ')}` });
  }
  pedido.estado = estado;
  res.json({ id: pedido.id, estado: pedido.estado });
});

app.listen(PORT, () => {
  console.log(`Servicio de Pedidos escuchando en el puerto ${PORT}`);
});
