const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 8000;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Serve uploaded files as static content
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload route
app.post('/upload', upload.single('file'), (req, res) => {
    if (req.file) {
        // Send the file URL as a response
        res.json({ url: `/uploads/${req.file.filename}` });
    } else {
        res.status(400).json({ error: 'File upload failed' });
    }
});

// WebSocket logic
io.on('connection', socket => {
    console.log('A user connected');
    
    // Send incoming file upload message to all clients
    socket.on('fileUpload', (messageData) => {
        socket.broadcast.emit('fileUpload', messageData);
    });

    // Chat message logic
    socket.on('chatMessage', (data) => {
        // Broadcast the message to other users
        socket.broadcast.emit('chatMessage', data);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});