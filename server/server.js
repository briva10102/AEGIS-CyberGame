const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const GameManager = require('./gameManager');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// Serve the browser game.
app.use(express.static(path.join(__dirname, '../client')));

// Simple health endpoint for deployment platforms.
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'aegis-7-orbital-breach'
    });
});

// WebSocket server shares the same HTTP server and public URL.
const wss = new WebSocketServer({
    server
});

new GameManager(wss);

// Explicitly bind to all network interfaces.
// This works locally, on LAN, and on platforms such as Render/Railway.
server.listen(PORT, '0.0.0.0', () => {
    console.log('========================================================');
    console.log('       AEGIS-7: ORBITAL BREACH');
    console.log('       MOSAIC 2026 Cooperative Cybersecurity Mission');
    console.log('========================================================');
    console.log(`Server listening on port ${PORT}`);
    console.log('WebSocket multiplayer: ENABLED');
    console.log('Room-based sessions: ENABLED');
    console.log('========================================================');
});