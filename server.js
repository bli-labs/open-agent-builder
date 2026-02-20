/**
 * Local reverse proxy that re-adds /proxy/8100 to incoming requests.
 *
 * The external proxy at code.bli.la/proxy/8100/ strips the /proxy/8100 prefix
 * before forwarding to this server. Next.js basePath expects that prefix,
 * so this proxy re-adds it before forwarding to Next.js.
 *
 * Flow: code.bli.la/proxy/8100/X → localhost:8100/X → localhost:8101/proxy/8100/X
 */
const http = require('http');

const LISTEN_PORT = 8100;
const NEXT_PORT = 8101;
const BASE_PATH = '/proxy/8100';

const server = http.createServer((req, res) => {
  const targetPath = req.url.startsWith(BASE_PATH) ? req.url : `${BASE_PATH}${req.url}`;

  const options = {
    hostname: 'localhost',
    port: NEXT_PORT,
    path: targetPath,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', () => {
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxyReq);
});

server.listen(LISTEN_PORT, () => {
  console.log(`Proxy on :${LISTEN_PORT} → Next.js on :${NEXT_PORT} (prepending ${BASE_PATH})`);
});
