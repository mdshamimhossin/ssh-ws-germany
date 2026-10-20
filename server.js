const http = require('http');
const net = require('net');
const { WebSocketServer } = require('ws');
const port = Number(process.env.PORT || 8080);
const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, {'Content-Type':'text/plain'}); res.end('ok'); return; }
  res.writeHead(404); res.end('Not found');
});
const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false, maxPayload: 1024 * 1024 });
server.on('upgrade', (req, socket, head) => {
  if (req.url !== '/') { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
});
wss.on('connection', ws => {
  const ssh = net.connect({ host: '127.0.0.1', port: 22 });
  ws.on('message', (data, isBinary) => { if (ssh.writable) ssh.write(data); });
  ssh.on('data', data => { if (ws.readyState === ws.OPEN) ws.send(data, {binary:true}); });
  const close = () => { if (ws.readyState === ws.OPEN) ws.close(); ssh.destroy(); };
  ssh.on('close', close); ssh.on('error', close); ws.on('close', () => ssh.destroy()); ws.on('error', () => ssh.destroy());
});
server.listen(port, '0.0.0.0', () => console.log(`Listening on ${port}`));
