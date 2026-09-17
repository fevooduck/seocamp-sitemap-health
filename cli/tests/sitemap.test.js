/**
 * cli/tests/sitemap.test.js
 *
 * Teste de integração para parsing recursivo de sitemapindex e urlset com servidor HTTP real.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { extractUrlsFromSitemap } from '../lib/sitemap.js';

test('sitemap - deve extrair URLs de sitemapindex recursivo e urlset', async (t) => {
  let port = 0;

  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');

    if (req.url === '/sitemap_index.xml') {
      res.end(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>http://127.0.0.1:${port}/post-sitemap.xml</loc>
  </sitemap>
  <sitemap>
    <loc>http://127.0.0.1:${port}/page-sitemap.xml</loc>
  </sitemap>
</sitemapindex>`);
    } else if (req.url === '/post-sitemap.xml') {
      res.end(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://127.0.0.1:${port}/blog/post-1</loc>
  </url>
  <url>
    <loc>http://127.0.0.1:${port}/blog/post-2</loc>
  </url>
</urlset>`);
    } else if (req.url === '/page-sitemap.xml') {
      res.end(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://127.0.0.1:${port}/sobre</loc>
  </url>
  <url>
    <loc>http://127.0.0.1:${port}/contato</loc>
  </url>
</urlset>`);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
  const indexUrl = `http://127.0.0.1:${port}/sitemap_index.xml`;

  t.after(() => {
    server.close();
  });

  const urls = await extractUrlsFromSitemap(indexUrl);

  assert.equal(urls.length, 4, 'Deve extrair as 4 URLs distribuídas nos dois subsitemaps');
  assert.ok(urls.includes(`http://127.0.0.1:${port}/blog/post-1`));
  assert.ok(urls.includes(`http://127.0.0.1:${port}/blog/post-2`));
  assert.ok(urls.includes(`http://127.0.0.1:${port}/sobre`));
  assert.ok(urls.includes(`http://127.0.0.1:${port}/contato`));
});
