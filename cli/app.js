/**
 * cli/app.js
 *
 * Instância do aplicativo Express e definição das rotas da API:
 * - GET  /api/health
 * - POST /api/extract-urls
 * - POST /api/check-url
 * - POST /api/export-excel
 */

import express from 'express';
import cors from 'cors';
import { extractUrlsFromSitemap } from './lib/sitemap.js';
import { checkUrlHealth } from './lib/health.js';
import { exportResultsToExcel } from './lib/excelExport.js';

const app = express();

// Middlewares essenciais
app.use(cors());
app.use(express.json({ limit: '10mb' }));

/**
 * Health check rápido para detecção de disponibilidade pelo frontend.
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'sitemap-health-backend',
    timestamp: new Date().toISOString()
  });
});

/**
 * Extrai URLs de um sitemap XML (inclusive sitemapindex recursivo).
 */
app.post('/api/extract-urls', async (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== 'string' || !url.trim().startsWith('http')) {
    return res.status(400).json({
      error: 'URL do sitemap inválida ou ausente. Deve iniciar com http:// ou https://'
    });
  }

  try {
    const urls = await extractUrlsFromSitemap(url.trim());
    return res.status(200).json({
      success: true,
      count: urls.length,
      urls
    });
  } catch (err) {
    console.error(`[backend] Erro ao extrair sitemap ${url}:`, err.message);
    return res.status(500).json({
      error: `Falha ao processar o sitemap: ${err.message}`
    });
  }
});

/**
 * Checa o status de saúde e destino de redirecionamento de uma URL específica.
 */
app.post('/api/check-url', async (req, res) => {
  const { url, timeout } = req.body || {};

  if (!url || typeof url !== 'string' || !url.trim().startsWith('http')) {
    return res.status(400).json({
      error: 'URL para verificação inválida ou ausente.'
    });
  }

  try {
    const result = await checkUrlHealth(url.trim(), {
      timeout: timeout ? Number(timeout) : 15000
    });
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error(`[backend] Erro ao verificar URL ${url}:`, err.message);
    return res.status(200).json({
      success: true,
      url,
      status: 0,
      statusText: err.message || 'Erro interno',
      location: null,
      responseTime: 0,
      contentType: 'indisponivel',
      source: 'local'
    });
  }
});

/**
 * Gera relatório XLSX a partir de lista de resultados.
 */
app.post('/api/export-excel', async (req, res) => {
  const { results, sitemapUrl } = req.body || {};

  if (!Array.isArray(results) || results.length === 0) {
    return res.status(400).json({
      error: 'Lista de resultados vazia ou inválida.'
    });
  }

  try {
    const filePath = await exportResultsToExcel(results, { sitemapUrl });
    return res.status(200).json({
      success: true,
      filePath
    });
  } catch (err) {
    console.error('[backend] Erro ao gerar XLSX:', err.message);
    return res.status(500).json({
      error: `Erro ao gerar arquivo Excel: ${err.message}`
    });
  }
});

export { app };
export default app;
