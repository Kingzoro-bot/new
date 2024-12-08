const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 8000;
const server = http.createServer(app);
const io = socketIO(server);

let activeUsers = new Set(); // To track logged-in nicknames

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat.html'));
});

// Real-time Chat
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
            io.emit('chatMessage', { user: userNickname, message: msg });
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

// Start server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;