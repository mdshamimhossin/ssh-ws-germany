
'use strict';

const http = require('http');
const net = require('net');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = Number(process.env.PORT || 8080);
const SSH_HOST = '127.0.0.1';
const SSH_PORT = 22;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-store'
    });
    res.end('ok');
    return;
  }

  res.writeHead(404, {
    'Content-Type': 'text/plain'
  });
  res.end('Not Found');
});

const wss = new WebSocketServer({
  noServer: true,
  perMessageDeflate: false,
  maxPayload: 1024 * 1024
});

server.on('upgrade', (req, socket, head) => {
  if (req.url !== '/') {
    socket.write(
      'HTTP/1.1 404 Not Found\r\n' +
      'Connection: close\r\n\r\n'
    );
    socket.destroy();
    return;
  }

  try {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } catch (err) {
    console.error('Upgrade error:', err.message);
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  const ssh = net.createConnection({
    host: SSH_HOST,
    port: SSH_PORT
  });

  let closed = false;
  let sshReady = false;
  const pending = [];
  let pendingBytes = 0;
  const MAX_PENDING = 1024 * 1024;

  function closeAll() {
    if (closed) return;
    closed = true;

    pending.length = 0;
    ssh.destroy();

    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    } else if (ws.readyState === WebSocket.CONNECTING) {
      ws.terminate();
    }
  }

  ssh.on('connect', () => {
    sshReady = true;
    console.log('Connected to local SSH server');

    for (const data of pending) {
      ssh.write(data);
    }

    pending.length = 0;
    pendingBytes = 0;
  });

  ws.on('message', (data) => {
    if (closed) return;

    const chunk = Buffer.from(data);

    if (sshReady && ssh.writable) {
      ssh.write(chunk);
    } else if (!sshReady) {
      pendingBytes += chunk.length;

      if (pendingBytes > MAX_PENDING) {
        console.error('Pending buffer limit exceeded');
        closeAll();
        return;
      }

      pending.push(chunk);
    }
  });

  ssh.on('data', (data) => {
    if (closed) return;

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data, {
        binary: true,
        compress: false
      }, (err) => {
        if (err) {
          console.error('WebSocket send error:', err.message);
          closeAll();
        }
      });
    }
  });

  ssh.on('end', closeAll);
  ssh.on('close', closeAll);

  ssh.on('error', (err) => {
    console.error('SSH connection error:', err.message);
    closeAll();
  });

  ws.on('close', closeAll);

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
    closeAll();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SSH WebSocket server listening on ${PORT}`);
  console.log(`SSH backend: ${SSH_HOST}:${SSH_PORT}`);
  console.log('WebSocket path: /');
  console.log('Health endpoint: /health');
});
