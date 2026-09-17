/**
 * cli/tests/health.test.js
 *
 * Teste de integração para checkUrlHealth com servidor HTTP real.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { checkUrlHealth } from '../lib/health.js';

test('health - deve validar 200, 301 com Location, 404 e status 0 em falha de conexão', async (t) => {
  const server = http.createServer((req, res) => {
    if (req.url === '/ok') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>OK</h1>');
    } else if (req.url === '/redirect') {
      res.writeHead(301, {
        'Location': '/destino-final',
        'Content-Type': 'text/plain'
      });
      res.end('Redirecting...');
    } else if (req.url === '/not-found') {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('Not Found');
    } else if (req.url === '/server-error') {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    } else {
      res.writeHead(400);
      res.end();
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
  });

  // 1. Testa 200 OK
  const res200 = await checkUrlHealth(`${baseUrl}/ok`);
  assert.equal(res200.status, 200);
  assert.equal(res200.location, null);
  assert.ok(res200.responseTime >= 0);
  assert.equal(res200.source, 'local');

  // 2. Testa 301 com Location resolvido
  const res301 = await checkUrlHealth(`${baseUrl}/redirect`);
  assert.equal(res301.status, 301);
  assert.equal(res301.location, `${baseUrl}/destino-final`, 'Deve resolver Location para URL absoluta');

  // 3. Testa 404 sem lançar exceção
  const res404 = await checkUrlHealth(`${baseUrl}/not-found`);
  assert.equal(res404.status, 404);
  assert.equal(res404.location, null);

  // 4. Testa porta fechada (falha de rede real) retornando status 0
  const resFalha = await checkUrlHealth('http://127.0.0.1:59999/inexistente', { timeout: 1000 });
  assert.equal(resFalha.status, 0);
  assert.equal(resFalha.contentType, 'indisponivel');
  assert.equal(resFalha.source, 'local');
});
