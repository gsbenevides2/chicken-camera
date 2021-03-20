const video = document.getElementById('video');
const alert = document.getElementsByClassName('alert')[0]
const startBtn = document.getElementById('start')
const stopBtn = document.getElementById('stop')
const reloadBtn = document.getElementById('reload')
const loaded = () => {
	startBtn.disabled = false
	alert.style.display = 'none'
}
try {
	eruda.init()
} catch (e) {}
const initConnection = () => {
	const socket = io('/');
	let localConnection;
	let remoteConnection;

	socket.on('offer', (socketId, description) => {
		// Ininit peer connection
		remoteConnection = new RTCPeerConnection();

		// Send Candidtates to establish a channel communication to send stream and data
		remoteConnection.onicecandidate = ({candidate}) => {
			candidate && socket.emit('candidate', socketId, candidate);
		};

		// Receive stream from remote client and add to remote video area
		remoteConnection.ontrack = ({streams: [stream]}) => {
			loaded()
			video.srcObject = stream;
		};

		// Set Local And Remote description and create answer
		remoteConnection
			.setRemoteDescription(description)
			.then(() => remoteConnection.createAnswer())
			.then(answer => remoteConnection.setLocalDescription(answer))
			.then(() => {
				socket.emit('answer', socketId, remoteConnection.localDescription);
			});
	});

	// Receive Answer to establish peer connection
	socket.on('answer', (description) => {
		localConnection.setRemoteDescription(description);
	});

	// Receive candidates and add to peer connection
	socket.on('candidate', (candidate) => {
		// GET Local or Remote Connection
		const conn = localConnection || remoteConnection;
		conn.addIceCandidate(new RTCIceCandidate(candidate));
	});
	socket.on('download-record', ({filename}) => {
		console.log('Realizando Pedido de Download', filename)
		const downloadUrl = `${window.location.origin}/records/${filename}`
		window.open(downloadUrl)
	})
	reloadBtn.onclick = () => {
		window.alert('Recarregando')
		socket.emit('reload-sender')
	}
	startBtn.onclick = () => {
		window.alert('Gravando')
		startBtn.disabled = true
		stopBtn.disabled = false
		socket.emit('start-record')
	}
	stopBtn.onclick = () => {
		startBtn.disabled = false
		stopBtn.disabled = true
		window.alert('Gravação Finalizada')
		socket.emit('stop-record')
	}
}
initConnection()
function setHeight() {
	const vh = window.innerHeight * 0.01
	document.documentElement.style.setProperty('--vh', `${vh}px`)
}
setHeight()
window.addEventListener('resize', setHeight)
