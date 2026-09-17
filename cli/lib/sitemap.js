/**
 * cli/lib/sitemap.js
 *
 * Módulo para download e extração recursiva de URLs de sitemaps XML.
 * - Utiliza axios + xml2js.
 * - Suporta sitemapindex (varredura recursiva de sitemaps aninhados).
 * - Suporta urlset tradicional.
 * - Implementa retries com backoff exponencial para HTTP 403 / 429.
 * - Elimina URLs duplicadas e previne loops infinitos de referência.
 */

import axios from 'axios';
import xml2js from 'xml2js';
import { getBrowserLikeHeaders } from './httpHeaders.js';

/**
 * Aguarda um período em milissegundos.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Normaliza qualquer valor que possa ser string ou nó com texto para string limpa.
 * @param {any} value
 * @returns {string}
 */
function extractTextValue(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && value._) return String(value._).trim();
  return String(value).trim();
}

/**
 * Faz download do XML com retry e backoff exponencial em caso de 403 ou 429.
 *
 * @param {string} url
 * @param {object} options
 * @returns {Promise<string>} Conteúdo XML
 */
async function fetchXmlWithRetry(url, options = {}) {
  const maxRetries = options.maxRetries ?? 3;
  const initialBackoff = options.initialBackoff ?? 1000;
  const timeout = options.timeout ?? 15000;

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios({
        url,
        method: 'GET',
        headers: getBrowserLikeHeaders(url),
        timeout,
        responseType: 'text',
        signal: options.signal,
        validateStatus: (status) => status < 400
      });

      return response.data;
    } catch (err) {
      lastError = err;
      const statusCode = err.response?.status;

      // Se for 403 (Cloudflare/WAF) ou 429 (Rate Limit) e ainda houver tentativas
      if ((statusCode === 403 || statusCode === 429) && attempt < maxRetries) {
        const jitter = Math.floor(Math.random() * 250);
        const delay = initialBackoff * Math.pow(2, attempt) + jitter;
        console.warn(`[sitemap] Recebido HTTP ${statusCode} para ${url}. Tentativa ${attempt + 1}/${maxRetries} em ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // Erros 404 ou outros não devem sofrer retry
      throw err;
    }
  }

  throw lastError;
}

/**
 * Extrai recursivamente todas as URLs contidas em um sitemap XML (ou sitemapindex).
 *
 * @param {string} sitemapUrl - URL do sitemap XML.
 * @param {object} [options]
 * @param {Set<string>} [options.visited] - Controle interno de sitemaps já processados.
 * @param {number} [options.maxDepth=10] - Limite de profundidade recursiva.
 * @param {number} [options.timeout=15000]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<string[]>} Lista única de URLs encontradas.
 */
export async function extractUrlsFromSitemap(sitemapUrl, options = {}) {
  const visited = options.visited || new Set();
  const maxDepth = options.maxDepth ?? 10;
  const currentDepth = options.depth ?? 0;

  if (visited.has(sitemapUrl) || currentDepth > maxDepth) {
    return [];
  }
  visited.add(sitemapUrl);

  const xmlContent = await fetchXmlWithRetry(sitemapUrl, options);

  // Parser do xml2js configurado para extração limpa
  const parser = new xml2js.Parser({
    explicitArray: true,
    trim: true,
    normalizeTags: true,
    stripPrefix: true // Remove namespaces como <sm:urlset> para uniformidade
  });

  const parsed = await parser.parseStringPromise(xmlContent);
  const foundUrls = new Set();

  // Caso 1: Índice de Sitemaps (<sitemapindex>)
  if (parsed.sitemapindex && Array.isArray(parsed.sitemapindex.sitemap)) {
    const sitemaps = parsed.sitemapindex.sitemap;

    for (const entry of sitemaps) {
      if (entry.loc && entry.loc.length > 0) {
        const childSitemapUrl = extractTextValue(entry.loc[0]);
        if (childSitemapUrl && !visited.has(childSitemapUrl)) {
          try {
            const childUrls = await extractUrlsFromSitemap(childSitemapUrl, {
              ...options,
              visited,
              depth: currentDepth + 1
            });
            for (const u of childUrls) {
              foundUrls.add(u);
            }
          } catch (childErr) {
            console.warn(`[sitemap] Falha ao ler subsitemap ${childSitemapUrl}:`, childErr.message);
          }
        }
      }
    }
  }

  // Caso 2: Conjunto de URLs (<urlset>)
  if (parsed.urlset && Array.isArray(parsed.urlset.url)) {
    const urls = parsed.urlset.url;

    for (const entry of urls) {
      if (entry.loc && entry.loc.length > 0) {
        const pageUrl = extractTextValue(entry.loc[0]);
        if (pageUrl && pageUrl.startsWith('http')) {
          foundUrls.add(pageUrl);
        }
      }
    }
  }

  // Fallback caso estrutura XML possua tags personalizadas mas tenha tags <loc>
  if (foundUrls.size === 0 && typeof xmlContent === 'string') {
    const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/gi;
    let match;
    const isSitemapIndex = /<sitemapindex/i.test(xmlContent);

    while ((match = locRegex.exec(xmlContent)) !== null) {
      const extracted = match[1].trim();
      if (isSitemapIndex) {
        if (!visited.has(extracted)) {
          try {
            const childUrls = await extractUrlsFromSitemap(extracted, {
              ...options,
              visited,
              depth: currentDepth + 1
            });
            for (const u of childUrls) foundUrls.add(u);
          } catch (childErr) {
            console.warn(`[sitemap] Falha ao ler subsitemap fallback ${extracted}:`, childErr.message);
          }
        }
      } else {
        foundUrls.add(extracted);
      }
    }
  }

  return Array.from(foundUrls);
}
