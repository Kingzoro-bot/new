const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 8000;

let activeUsers = new Map(); // Store users by their nickname and associated socket IDs

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
            // User has already logged in on a different browser, just add the new socket to their entry
            activeUsers.get(nickname).add(socket.id);
            callback({ success: true });
            io.emit('userList', Array.from(activeUsers.keys()));
            console.log(`${nickname} joined from a new browser.`);
        } else {
            // First time logging in
            userNickname = nickname;
            activeUsers.set(nickname, new Set([socket.id])); // Store socket ID in a set for the nickname
            callback({ success: true });
            io.emit('userList', Array.from(activeUsers.keys()));
            io.emit('chatMessage', { user: 'System', message: `${nickname} has joined the chat.`, timestamp: Date.now() });
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
            // Remove the socket from the active user set
            let userSockets = activeUsers.get(userNickname);
            userSockets.delete(socket.id);

            // If the user has no more active sockets, they should be considered disconnected
            if (userSockets.size === 0) {
                activeUsers.delete(userNickname); // Remove the user from active users
                io.emit('userList', Array.from(activeUsers.keys()));
                io.emit('chatMessage', { user: 'System', message: `${userNickname} has left the chat.`, timestamp: Date.now() });
                console.log(`${userNickname} has left the chat.`);
            }
        }
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});