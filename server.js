const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 8000;

let activeUsers = new Set(); // To track logged-in nicknames

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    },
});

const upload = multer({ storage });

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve login.html when the user accesses the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Serve chat.html when the user accesses the /chat route
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat.html'));
});

// Handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
    if (req.file) {
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ success: true, fileUrl });
    } else {
        res.status(400).json({ success: false, message: 'File upload failed' });
    }
});

// Handle WebSocket connections
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

    // Handle user messages
    socket.on('chatMessage', (msg) => {
        if (userNickname) {
            const timestamp = Date.now();
            io.emit('chatMessage', { user: userNickname, message: msg, timestamp });
        }
    });

    // Handle file messages
    socket.on('fileMessage', (data) => {
        if (userNickname) {
            io.emit('fileMessage', {
                user: userNickname,
                fileUrl: data.fileUrl,
                fileType: data.fileType,
                timestamp: Date.now(),
            });
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