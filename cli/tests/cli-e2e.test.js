/**
 * cli/tests/cli-e2e.test.js
 *
 * Teste E2E da ferramenta CLI executável (check-sitemap.js).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('cli-e2e - executa o script check-sitemap.js contra sitemap real e gera XLSX', async (t) => {
  let port = 0;

  const server = http.createServer((req, res) => {
    if (req.url === '/sitemap.xml') {
      res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
      res.end(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>http://127.0.0.1:${port}/pagina-ok</loc></url>
  <url><loc>http://127.0.0.1:${port}/pagina-redirect</loc></url>
  <url><loc>http://127.0.0.1:${port}/pagina-sumiu</loc></url>
</urlset>`);
    } else if (req.url === '/pagina-ok') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Sucesso</h1>');
    } else if (req.url === '/pagina-redirect') {
      res.writeHead(301, { 'Location': `http://127.0.0.1:${port}/novo-destino` });
      res.end();
    } else if (req.url === '/pagina-sumiu') {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('404');
    } else {
      res.writeHead(400);
      res.end();
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
  const sitemapUrl = `http://127.0.0.1:${port}/sitemap.xml`;

  t.after(() => {
    server.close();
  });

  const cliPath = path.resolve('./cli/check-sitemap.js');
  const { stdout } = await execFileAsync(process.execPath, [cliPath, sitemapUrl]);

  // Remove caracteres de escape ANSI para asserção de texto limpo
  const cleanStdout = stdout.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

  assert.ok(cleanStdout.includes('Sitemap Health Checker CLI'), 'Deve exibir banner do CLI');
  assert.ok(cleanStdout.includes('Extraídas 3 URLs únicas'), 'Deve extrair as 3 URLs');
  assert.ok(/Sucesso \(2xx\):\s+1/.test(cleanStdout), 'Deve registrar 1 sucesso 2xx');
  assert.ok(/Redirecionamentos \(3xx\):\s+1/.test(cleanStdout), 'Deve registrar 1 redirecionamento 3xx');
  assert.ok(/Erros do Cliente \(4xx\):\s+1/.test(cleanStdout), 'Deve registrar 1 erro 4xx');
  assert.ok(cleanStdout.includes('Relatório Excel gerado com sucesso'), 'Deve confirmar geração do Excel');

  // Verifica que o arquivo .xlsx foi criado no disco
  const reportsDir = path.resolve('./cli/reports');
  const files = fs.readdirSync(reportsDir).filter((f) => f.endsWith('.xlsx'));
  assert.ok(files.length > 0, 'Deve existir pelo menos um arquivo .xlsx em cli/reports');

  // Limpeza dos arquivos temporários de teste
  for (const f of files) {
    try {
      fs.unlinkSync(path.join(reportsDir, f));
    } catch {}
  }
});
