/**
 * cli/tests/server.test.js
 *
 * Teste de integração das rotas do servidor Express local:
 * - GET  /api/health
 * - POST /api/extract-urls
 * - POST /api/check-url
 * - POST /api/export-excel
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../app.js';

test('server - rotas da API Express', async (t) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
  });

  // 1. GET /api/health
  const healthRes = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthRes.status, 200);
  const healthJson = await healthRes.json();
  assert.equal(healthJson.status, 'ok');
  assert.equal(healthJson.service, 'sitemap-health-backend');

  // 2. POST /api/extract-urls (validação de erro para URL ausente)
  const errExtract = await fetch(`${baseUrl}/api/extract-urls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(errExtract.status, 400);

  // 3. POST /api/check-url (validação de erro para URL ausente)
  const errCheck = await fetch(`${baseUrl}/api/check-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(errCheck.status, 400);

  // 4. POST /api/check-url (sucesso checando o próprio endpoint health)
  const okCheck = await fetch(`${baseUrl}/api/check-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: `${baseUrl}/api/health` })
  });
  assert.equal(okCheck.status, 200);
  const checkJson = await okCheck.json();
  assert.equal(checkJson.success, true);
  assert.equal(checkJson.status, 200);
  assert.equal(checkJson.source, 'local');
});
