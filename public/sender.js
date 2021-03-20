const video = document.getElementById('video');
const alert = document.getElementsByClassName('alert')[0]
const hideAlerts = () => {
	alert.style.display = 'none'
}
try {
	eruda.init()
} catch (e) {}

let recorder
let recordedData = []
function startRecording(stream) {
	recorder = new MediaRecorder(stream)
	recordedData = []
	recorder.start();
	recorder.onerror = console.error
}

window.onload = async () => {
	const devices = await navigator.mediaDevices.enumerateDevices()
	const cameras = devices.filter(device => device.kind === 'videoinput')
	const camera = cameras[cameras.length - 1]
	const stream = await navigator.mediaDevices.getUserMedia({
		video: {
			deviceId: camera.deviceId,
			facingMode: ['user', 'environment']
		},
		audio: true
	})
	video.captureStream = video.captureStream || video.mozCaptureStream
	video.srcObject = stream;
	initConnection(stream);
}

function wait(time) {
	return new Promise(resolve => {
		setTimeout(resolve, time)
	})
}
const initConnection = (stream) => {
	const socket = io('/');
	let localConnection;
	let remoteConnection;

	// Start a RTCPeerConnection to each client
	socket.on('other-users', (otherUsers) => {
		// Ignore when not exists other users connected
		if (!otherUsers || !otherUsers.length) return;

		const socketId = otherUsers[0];

		// Ininit peer connection
		localConnection = new RTCPeerConnection();

		// Add all tracks from stream to peer connection
		stream.getTracks().forEach(track => localConnection.addTrack(track, stream));
		hideAlerts()
		// Send Candidtates to establish a channel communication to send stream and data
		localConnection.onicecandidate = ({candidate}) => {
			candidate && socket.emit('candidate', socketId, candidate);
		};

		// Create Offer, Set Local Description and Send Offer to other users connected
		localConnection
			.createOffer()
			.then(offer => localConnection.setLocalDescription(offer))
			.then(() => {
				socket.emit('offer', socketId, localConnection.localDescription);
			});
	});

	// Receive Offer From Other Client
	socket.on('offer', (socketId, description) => {
		// Ininit peer connection
		remoteConnection = new RTCPeerConnection();

		// Send Candidtates to establish a channel communication to send stream and data
		remoteConnection.onicecandidate = ({candidate}) => {
			candidate && socket.emit('candidate', socketId, candidate);
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
	socket.on('reload-sender', () => {
		console.log('Recarregando')
		document.location.reload()
	})
	socket.on('start-record', () => {
		console.log('Gravação Iniciada')
		startRecording(stream)
	})
	socket.on('stop-record', async () => {
		console.log('Gravação Cancelada')
		recorder.ondataavailable = async (event) => {
			recordedData.push(event.data);
			const recordedBlog = new Blob(recordedData, {type: 'video/webp'})
			const body = new FormData()
			const date = new Date()
			const filename = `${date.toISOString()}.webm`
			body.append('video', recordedBlog, filename)
			console.log('Enviando Gravação')
			await fetch('/records', {
				method: 'POST',
				body
			})
			console.log('Gravação Enviada')
			socket.emit('sended-record', {filename})
			recordedData = []
		}
		recorder.stop()
	})
}
function setHeight() {
	const vh = window.innerHeight * 0.01
	document.documentElement.style.setProperty('--vh', `${vh}px`)
}
setHeight()
window.addEventListener('resize', setHeight)
