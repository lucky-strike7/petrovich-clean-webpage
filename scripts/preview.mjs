import { fileURLToPath } from 'node:url';
import { createApp } from '../server/site.mjs';

const port = 5192;
const host = process.argv[2] ?? '127.0.0.1';
const browserHost = host.includes(':') ? `[${host}]` : host;
const url = `http://${browserHost}:${port}/`;
const root = fileURLToPath(new URL('../', import.meta.url));

const server = createApp({
  root,
  contact(_req, res) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Форма отключена в локальном предпросмотре.');
  },
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Порт ${port} занят. Если предпросмотр уже запущен, откройте ${url}`);
  } else {
    console.error(error.message);
  }
  process.exitCode = 1;
});

server.listen(port, host, () => console.log(`Рабочий сайт: ${url}`));
