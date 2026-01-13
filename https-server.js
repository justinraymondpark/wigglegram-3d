// Simple HTTPS server with self-signed certificate for testing gyroscope
// Run with: node https-server.js

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8443;
const HTTP_PORT = 8080;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mpo': 'image/mpo',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

// Request handler
function handleRequest(req, res) {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found: ' + filePath);
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content, 'utf-8');
        }
    });
}

// Check if certificates exist
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.log('Generating self-signed certificate...');

    const cmd = `openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"`;

    exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
            console.error('Failed to generate certificate:', error);
            console.log('\nFalling back to HTTP only...');
            startHttpOnly();
        } else {
            console.log('Certificate generated!');
            startServers();
        }
    });
} else {
    startServers();
}

function startServers() {
    // HTTPS server
    const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };

    const httpsServer = https.createServer(options, handleRequest);
    httpsServer.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🔒 HTTPS Server running at:`);
        console.log(`   Local:   https://localhost:${PORT}`);

        // Get local IP
        const { networkInterfaces } = require('os');
        const nets = networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                if (net.family === 'IPv4' && !net.internal) {
                    console.log(`   Network: https://${net.address}:${PORT}`);
                }
            }
        }
        console.log(`\n⚠️  You'll need to accept the self-signed certificate in your browser.`);
        console.log(`   On iOS: Go to Settings > General > About > Certificate Trust Settings`);
        console.log(`   On Android: Just tap "Advanced" and "Proceed anyway"\n`);
    });

    // Also start HTTP for local testing
    const httpServer = http.createServer(handleRequest);
    httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
        console.log(`📡 HTTP Server also running at http://localhost:${HTTP_PORT}\n`);
    });
}

function startHttpOnly() {
    const httpServer = http.createServer(handleRequest);
    httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
        console.log(`\n📡 HTTP Server running at http://localhost:${HTTP_PORT}`);
        console.log(`⚠️  Gyroscope will only work on desktop (mouse) or localhost`);
        console.log(`   For mobile, you need HTTPS. Install openssl and run again.\n`);
    });
}
