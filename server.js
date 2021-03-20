const express = require('express');
const socketio = require('socket.io');
const http = require('http');
const path = require('path')
const multer = require('multer')
const crypto = require('crypto')

const port = 3000

// Create server
const app = express();
const server = http.Server(app);

// Map HTML and Javascript files as static
app.use(express.static('public'));

// Init Socket IO Server
const io = socketio(server);

// Array to map all clients connected in socket
let connectedUsers = [];

// Called whend a client start a socket connection
io.on('connection', (socket) => {
	// It's necessary to socket knows all clients connected
	connectedUsers.push(socket.id);
	console.log('connection', socket.id)
	// Emit to myself the other users connected array to start a connection with each them
	const otherUsers = connectedUsers.filter(socketId => socketId !== socket.id);
	socket.emit('other-users', otherUsers);

	// Send Offer To Start Connection
	socket.on('offer', (socketId, description) => {
		console.log('offer', socketId)
		socket.to(socketId).emit('offer', socket.id, description);
	});

	// Send Answer From Offer Request
	socket.on('answer', (socketId, description) => {
		console.log('answer', socketId)
		socket.to(socketId).emit('answer', description);
	});

	// Send Signals to Establish the Communication Channel
	socket.on('candidate', (socketId, candidate) => {
		console.log('candidate', socketId)
		socket.to(socketId).emit('candidate', candidate);
	});

	// Remove client when socket is disconnected
	socket.on('disconnect', () => {
		connectedUsers = connectedUsers.filter(socketId => socketId !== socket.id);
	});
	socket.on('reload-sender', () => {
		console.log('Pedido de recarregamento')
		io.emit('reload-sender')
	})
	socket.on('start-record', () => {
		console.log('Pedido de gravação')
		io.emit('start-record')
	})
	socket.on('stop-record', () => {
		console.log('Pedido de paragem da gravação')
		io.emit('stop-record')
	})
	socket.on('sended-record', ({filename}) => {
		console.log('Gravação Recebida', filename)
		io.emit('download-record', {filename})
	})
});

// Return Index HTML when access root route
app.get('/sender', (_req, res) => {
	res.sendFile(path.resolve(__dirname, 'public', 'sender.html'));
});
app.get('/receiver', (_req, res) => {
	res.sendFile(path.resolve(__dirname, 'public', 'receiver.html'));
});

const multerConfig = {
	storage: multer.diskStorage({
		destination: path.resolve(__dirname, 'records'),
		filename(req, file, callback) {
			callback(null, file.originalname)
		}
	})
}
const upload = multer(multerConfig)
app.post('/records', upload.single('video'), (req, res) => {
	res.send('OK')
})
app.get('/records/:name', (req, res) => {
	const name = req.params.name
	res.download(path.resolve(__dirname, 'records', name))
})
// Start server in port 3000 or the port passed at "PORT" env variable
server.listen(port,
	() => console.log('Servidor Iniciado'));
