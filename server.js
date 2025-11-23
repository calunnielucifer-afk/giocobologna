const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Normalize URL
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    // Get file extension
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeType = mimeTypes[extname] || 'application/octet-stream';

    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // File not found, try to serve index.html for SPA routing
            if (req.url !== '/' && req.url.indexOf('.') === -1) {
                filePath = './index.html';
                fs.readFile(filePath, (error, content) => {
                    if (error) {
                        // If index.html also doesn't exist, send 404
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end('<h1>404 Not Found</h1><p>The requested resource could not be found.</p>');
                    } else {
                        // Serve index.html
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content, 'utf-8');
                    }
                });
            } else {
                // Send 404 for other missing files
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1><p>The requested resource could not be found.</p>');
            }
            return;
        }

        // Read and serve the file
        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>404 Not Found</h1><p>The requested resource could not be found.</p>');
                } else {
                    // Server error
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end('<h1>500 Internal Server Error</h1><p>Sorry, there was a problem with the server.</p>');
                }
            } else {
                // Serve the file
                res.writeHead(200, { 'Content-Type': mimeType });
                res.end(content, 'utf-8');
            }
        });
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🎮 SERENA ESCAPE SERVER 🎮                    ║
╠══════════════════════════════════════════════════════════════╣
║  Server running at:                                              ║
║  🌐 Local:    http://localhost:${PORT}                           ║
║  🌐 Network:  http://0.0.0.0:${PORT}                           ║
║                                                                  ║
║  📱 Mobile Optimized:                                           ║
║  ✅ Touch controls                                              ║
║  ✅ Responsive design                                            ║
║  ✅ Canvas scaling                                              ║
║                                                                  ║
║  🎯 Game Features:                                               ║
║  ✅ Emoji puzzle (🍎🍐🍌☕)                                        ║
║  ✅ Riddles system                                              ║
║  ✅ Platform game mechanics                                      ║
║                                                                  ║
║  📡 To make server public:                                       ║
║  1. Install Node.js                                              ║
║  2. Run: npm install -g http-server                             ║
║  3. Or use: npx serve .                                        ║
║  4. For cloud: Deploy to Vercel, Netlify, or GitHub Pages       ║
╚══════════════════════════════════════════════════════════════╝
    `);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});
