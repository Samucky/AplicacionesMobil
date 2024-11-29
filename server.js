const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

// Conexión a MongoDB Atlas
mongoose.connect('mongodb+srv://samuchim10:samuel@cluster0.3ehag.mongodb.net/chatdb?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Conectado a MongoDB");
}).catch((err) => {
  console.error("Error de conexión a MongoDB:", err);
});

// Definir el esquema y modelo de los mensajes
const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  ip: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Crear el servidor con Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir los archivos estáticos (el front-end)
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de Socket.io
io.on('connection', (socket) => {
  console.log('Un nuevo cliente se ha conectado:', socket.id);

  // Recibir la IP del cliente
  let clientIp = null;

  socket.on('load messages', (ip) => {
    clientIp = ip;

    // Enviar todos los mensajes anteriores al cliente
    Message.find().sort({ date: 1 }).then(messages => {
      socket.emit('load messages', messages.filter(message => message.ip === clientIp || true)); // Filtrar si es necesario
    });
  });

  // Recibir un nuevo mensaje del cliente
  socket.on('chat message', (data) => {
    if (data && typeof data.text === 'string' && typeof data.ip === 'string') {
      const newMessage = new Message({
        text: data.text,
        ip: data.ip,
      });

      newMessage.save().then(() => {
        io.emit('chat message', newMessage);
      }).catch((err) => {
        console.error("Error al guardar el mensaje:", err);
        socket.emit('error', { message: 'No se pudo guardar el mensaje.' });
      });
    } else {
      console.error("Datos de mensaje inválidos:", data);
      socket.emit('error', { message: 'Formato de mensaje inválido.' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Configurar el puerto para el servidor
server.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});
