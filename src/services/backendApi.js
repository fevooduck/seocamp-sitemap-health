/**
 * src/services/backendApi.js
 *
 * Comunicação com o motor backend Express local (porta 4000).
 */

const BACKEND_URL = 'http://localhost:4000';

/**
 * Verifica rapidamente se o servidor Express local está ativo (timeout 1500ms).
 * @returns {Promise<boolean>}
 */
export async function checkServerHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const response = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return data.status === 'ok';
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Solicita a extração e resolução recursiva de sitemaps pelo motor backend local.
 * @param {string} url
 * @param {AbortSignal} [signal]
 * @returns {Promise<string[]>}
 */
export async function extractUrlsViaBackend(url, signal) {
  const response = await fetch(`${BACKEND_URL}/api/extract-urls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Falha ao extrair URLs via servidor local');
  }

  return data.urls || [];
}

/**
 * Checa a integridade de uma URL individual pelo motor backend local.
 * @param {string} url
 * @param {object} [options]
 * @param {number} [options.timeout=15000]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<object>}
 */
export async function checkUrlViaBackend(url, options = {}) {
  const response = await fetch(`${BACKEND_URL}/api/check-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      timeout: options.timeout || 15000
    }),
    signal: options.signal
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      url,
      status: 0,
      statusText: data.error || 'Erro no backend local',
      location: null,
      responseTime: 0,
      contentType: 'indisponivel',
      source: 'local'
    };
  }

  return data;
}

/**
 * Solicita ao servidor backend a geração do relatório XLSX via ExcelJS.
 * @param {Array<object>} results
 * @param {string} sitemapUrl
 * @returns {Promise<string>} Caminho do arquivo gerado
 */
export async function exportExcelViaBackend(results, sitemapUrl) {
  const response = await fetch(`${BACKEND_URL}/api/export-excel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results, sitemapUrl })
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Falha ao gerar arquivo Excel no backend');
  }

  return data.filePath;
}
