const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 8000;

// Middleware for parsing request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files for uploaded content
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Set up storage for file uploads
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

// Endpoint to handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
    if (req.file) {
        res.json({ url: `/uploads/${req.file.filename}` });
    } else {
        res.status(400).json({ error: 'File upload failed' });
    }
});

// Serve the login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Serve the chat page
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat.html'));
});

// Track active users
const activeUsers = new Set();

io.on('connection', (socket) => {
    let userNickname = null;

    // Handle user login
    socket.on('login', (nickname, callback) => {
        if (activeUsers.has(nickname)) {
            callback({ success: false, message: 'Nickname already taken' });
        } else {
            userNickname = nickname;
            activeUsers.add(nickname);
            io.emit('userList', Array.from(activeUsers));
            callback({ success: true });
            console.log(`${nickname} has joined the chat.`);
        }
    });

    // Handle chat messages
    socket.on('chatMessage', (data) => {
        if (userNickname) {
            io.emit('chatMessage', { 
                user: userNickname, 
                message: data.message, 
                timestamp: data.timestamp 
            });
        }
    });

    // Handle file uploads (via WebSocket)
    socket.on('fileUpload', (data) => {
        if (userNickname) {
            io.emit('fileUpload', data); // Broadcast the uploaded file message
        }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        if (userNickname) {
            activeUsers.delete(userNickname);
            io.emit('userList', Array.from(activeUsers));
            console.log(`${userNickname} has left the chat.`);
        }
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});