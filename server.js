const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 8000;

let activeUsers = new Set(); // To track logged-in nicknames

// Serve login.html when the user accesses the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Serve chat.html when the user accesses the /chat route
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat.html'));
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
            io.emit('userList', Array.from(activeUsers)); // Update active users list
            io.emit('chatMessage', { user: 'System', message: `${nickname} has joined the chat.`, timestamp: Date.now() }); // Notify all users that someone has joined
            callback({ success: true });
            console.log(`${nickname} has joined the chat.`);
        }
    });

    // Handle user messages
    socket.on('chatMessage', (msg) => {
        if (userNickname) {
            const timestamp = Date.now(); // Get current timestamp
            io.emit('chatMessage', { user: userNickname, message: msg, timestamp }); // Broadcast the message to all users
        }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        if (userNickname) {
            activeUsers.delete(userNickname);
            io.emit('userList', Array.from(activeUsers)); // Update active users list
            io.emit('chatMessage', { user: 'System', message: `${userNickname} has left the chat.`, timestamp: Date.now() }); // Notify all users that someone has left
            console.log(`${userNickname} has left the chat.`);
        }
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});