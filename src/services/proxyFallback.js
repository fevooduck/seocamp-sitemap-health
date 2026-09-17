/**
 * src/services/proxyFallback.js
 *
 * Implementação da cascata de fallbacks para contornar restrições de CORS
 * do navegador sem gerar dados falsos nem poluir o console com erros desnecessários.
 */

import { parseSitemapXml } from './sitemapParser.js';

/**
 * Cria um timer de timeout associado a um AbortController.
 * @param {number} ms
 * @param {AbortSignal} [parentSignal]
 * @returns {{ signal: AbortSignal, cleanup: () => void }}
 */
function createTimeoutSignal(ms = 10000, parentSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error('Timeout de requisição'));
  }, ms);

  if (parentSignal) {
    parentSignal.addEventListener('abort', () => {
      clearTimeout(timer);
      controller.abort(parentSignal.reason);
    });
  }

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer)
  };
}

/**
 * Baixa o conteúdo XML de um sitemap utilizando a cascata de fallbacks:
 * 1. Fetch direto
 * 2. Proxy primário (corsproxy.io)
 * 3. Proxy secundário (allorigins.win/raw)
 *
 * @param {string} url
 * @param {object} [options]
 * @param {AbortSignal} [options.signal]
 * @param {number} [options.timeout=12000]
 * @returns {Promise<string>} Conteúdo XML
 */
export async function downloadSitemapXml(url, options = {}) {
  const timeoutMs = options.timeout || 12000;

  // 1. Tentativa: Fetch Direto
  try {
    const { signal, cleanup } = createTimeoutSignal(timeoutMs, options.signal);
    try {
      const res = await fetch(url, { signal, headers: { Accept: 'application/xml, text/xml, */*' } });
      if (res.ok) {
        const text = await res.text();
        if (text && text.includes('<') && (text.includes('urlset') || text.includes('sitemapindex') || text.includes('loc'))) {
          cleanup();
          return text;
        }
      }
    } finally {
      cleanup();
    }
  } catch (directErr) {
    // Falha esperada em sites sem cabeçalhos CORS liberados
  }

  // 2. Tentativa: Proxy Primário (corsproxy.io)
  try {
    const { signal, cleanup } = createTimeoutSignal(timeoutMs, options.signal);
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl, { signal });
      if (res.ok) {
        const text = await res.text();
        if (text && text.includes('<') && (text.includes('urlset') || text.includes('sitemapindex') || text.includes('loc'))) {
          cleanup();
          return text;
        }
      }
    } finally {
      cleanup();
    }
  } catch (proxy1Err) {
    // Falha no proxy 1, avança para o secundário
  }

  // 3. Tentativa: Proxy Secundário (allorigins.win/raw)
  try {
    const { signal, cleanup } = createTimeoutSignal(timeoutMs, options.signal);
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl, { signal });
      if (res.ok) {
        const text = await res.text();
        if (text && text.includes('<') && (text.includes('urlset') || text.includes('sitemapindex') || text.includes('loc'))) {
          cleanup();
          return text;
        }
      }
    } finally {
      cleanup();
    }
  } catch (proxy2Err) {
    // Falha no proxy 2
  }

  throw new Error(`Falha ao baixar sitemap XML em todas as rotas (direto e proxies CORS).`);
}

/**
 * Extrai recursivamente todas as URLs navegando por sitemapindex no browser.
 * @param {string} rootSitemapUrl
 * @param {object} [options]
 * @returns {Promise<string[]>}
 */
export async function extractUrlsInBrowser(rootSitemapUrl, options = {}) {
  const visited = new Set();
  const allUrls = new Set();

  async function processSitemap(url, depth = 0) {
    if (visited.has(url) || depth > 5) return;
    visited.add(url);

    const xml = await downloadSitemapXml(url, options);
    const parsed = parseSitemapXml(xml);

    if (parsed.isIndex && parsed.childSitemaps.length > 0) {
      for (const childUrl of parsed.childSitemaps) {
        if (!visited.has(childUrl)) {
          try {
            await processSitemap(childUrl, depth + 1);
          } catch (childErr) {
            console.warn('[proxyFallback] Falha ao processar subsitemap:', childUrl, childErr);
          }
        }
      }
    } else {
      for (const u of parsed.urls) {
        allUrls.add(u);
      }
    }
  }

  await processSitemap(rootSitemapUrl, 0);
  return Array.from(allUrls);
}

/**
 * Checa a saúde de uma URL no browser utilizando a cascata de fallbacks.
 *
 * Regras:
 * - Fetch direto DESATIVADO por padrão para não poluir o console DevTools com erros CORS.
 * - Proxy 1: corsproxy.io (lê status real e cabeçalho X-Final-URL para redirecionamentos).
 * - Proxy 2: allorigins.win/get (lê JSON status.http_code, status.content_type, status.url).
 * - Sem dados inventados: se todos falharem -> status: 0, source: 'unavailable', contentType: 'indisponivel'.
 *
 * @param {string} url
 * @param {object} [options]
 * @param {boolean} [options.allowDirectFetch=false] - Ativar fetch direto antes do proxy.
 * @param {number} [options.timeout=10000]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<object>}
 */
export async function checkUrlInBrowser(url, options = {}) {
  const startTime = performance.now();
  const timeoutMs = options.timeout || 10000;
  const allowDirect = options.allowDirectFetch ?? false;

  // 1. Fetch Direto (se explicitamente ativado nas opções avançadas)
  if (allowDirect) {
    try {
      const { signal, cleanup } = createTimeoutSignal(timeoutMs, options.signal);
      try {
        const response = await fetch(url, {
          method: 'GET',
          signal,
          redirect: 'manual'
        });
        const elapsed = Math.round(performance.now() - startTime);
        const status = response.status;
        const statusText = response.statusText || String(status);
        const location = response.headers.get('location') || null;
        const contentType = (response.headers.get('content-type') || 'desconhecido').split(';')[0].trim();
        cleanup();

        return {
          url,
          status,
          statusText,
          location,
          responseTime: elapsed,
          contentType,
          source: 'direct'
        };
      } finally {
        cleanup();
      }
    } catch {
      // Avança para o proxy primário
    }
  }

  // 2. Proxy Primário (corsproxy.io)
  try {
    const { signal, cleanup } = createTimeoutSignal(timeoutMs, options.signal);
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        method: 'GET',
        signal
      });

      const elapsed = Math.round(performance.now() - startTime);
      const status = response.status;
      const statusText = response.statusText || String(status);

      // Lê X-Final-URL ou Location para identificar redirecionamento
      const finalUrl = response.headers.get('x-final-url') || null;
      const rawLocation = response.headers.get('location') || null;
      let location = rawLocation;

      if (!location && finalUrl && finalUrl !== url) {
        location = finalUrl;
      }

      const contentType = (response.headers.get('content-type') || 'desconhecido').split(';')[0].trim();
      cleanup();

      return {
        url,
        status,
        statusText,
        location,
        responseTime: elapsed,
        contentType,
        source: 'corsproxy'
      };
    } finally {
      cleanup();
    }
  } catch {
    // Avança para o proxy secundário
  }

  // 3. Proxy Secundário (allorigins.win/get)
  try {
    const { signal, cleanup } = createTimeoutSignal(timeoutMs, options.signal);
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, { signal });

      if (response.ok) {
        const data = await response.json();
        const elapsed = Math.round(performance.now() - startTime);

        if (data && data.status && typeof data.status.http_code === 'number') {
          const status = data.status.http_code;
          const statusText = status >= 200 && status < 300 ? 'OK via Proxy' : `HTTP ${status}`;
          const targetUrl = data.status.url || null;
          const location = (targetUrl && targetUrl !== url) ? targetUrl : null;
          const contentType = (data.status.content_type || 'desconhecido').split(';')[0].trim();
          cleanup();

          return {
            url,
            status,
            statusText,
            location,
            responseTime: elapsed,
            contentType,
            source: 'allorigins'
          };
        }
      }
    } finally {
      cleanup();
    }
  } catch {
    // Falha em todos os proxies
  }

  // 4. Sem Dados Inventados: falha em todos os caminhos
  const elapsed = Math.round(performance.now() - startTime);
  return {
    url,
    status: 0,
    statusText: 'Indisponível (CORS / Timeout / Rede)',
    location: null,
    responseTime: elapsed,
    contentType: 'indisponivel',
    source: 'unavailable'
  };
}
