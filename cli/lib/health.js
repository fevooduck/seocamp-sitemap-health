/**
 * cli/lib/health.js
 *
 * Checagem precisa de integridade HTTP de URLs individuais:
 * - maxRedirects: 0 para interceptar códigos 3xx e capturar o header Location exato.
 * - validateStatus: () => true para não lançar exceções em respostas 4xx e 5xx reais.
 * - Captura falhas de rede como status 0.
 */

import axios from 'axios';
import { getBrowserLikeHeaders } from './httpHeaders.js';

/**
 * Normaliza e resolve um cabeçalho Location para uma URL absoluta.
 * @param {string} locationHeader
 * @param {string} originalUrl
 * @returns {string} URL absoluta de redirecionamento
 */
function resolveRedirectLocation(locationHeader, originalUrl) {
  if (!locationHeader) return '';
  try {
    return new URL(locationHeader, originalUrl).href;
  } catch {
    return locationHeader;
  }
}

/**
 * Checa o status e a integridade de uma URL.
 *
 * @param {string} url
 * @param {object} [options]
 * @param {number} [options.timeout=15000] - Timeout em milissegundos.
 * @param {AbortSignal} [options.signal] - Sinal para cancelamento.
 * @returns {Promise<{
 *   url: string,
 *   status: number,
 *   statusText: string,
 *   location: string | null,
 *   responseTime: number,
 *   contentType: string,
 *   source: 'local'
 * }>}
 */
export async function checkUrlHealth(url, options = {}) {
  const timeout = options.timeout ?? 15000;
  const startTime = performance.now();

  try {
    const response = await axios({
      url,
      method: 'GET',
      headers: getBrowserLikeHeaders(url),
      maxRedirects: 0,
      validateStatus: () => true,
      timeout,
      signal: options.signal,
      decompress: true,
      // Não precisa baixar o corpo inteiro de páginas gigantescas
      responseType: 'stream'
    });

    const responseTime = Math.round(performance.now() - startTime);
    const status = response.status;
    const statusText = response.statusText || String(status);
    const rawContentType = response.headers['content-type'] || 'desconhecido';
    const contentType = Array.isArray(rawContentType)
      ? rawContentType[0].split(';')[0].trim()
      : rawContentType.split(';')[0].trim();

    let location = null;
    if (status >= 300 && status < 400) {
      const rawLocation = response.headers['location'] || response.headers['Location'] || '';
      location = resolveRedirectLocation(rawLocation, url);
    }

    // Fecha o stream para liberar conexões do pool
    if (response.data && typeof response.data.destroy === 'function') {
      response.data.destroy();
    }

    return {
      url,
      status,
      statusText,
      location,
      responseTime,
      contentType,
      source: 'local'
    };
  } catch (error) {
    const responseTime = Math.round(performance.now() - startTime);

    // Caso axios tenha recebido resposta de redirecionamento que gerou erro maxRedirects
    if (error.response) {
      const status = error.response.status;
      const rawLocation = error.response.headers['location'] || error.response.headers['Location'] || '';
      const location = (status >= 300 && status < 400)
        ? resolveRedirectLocation(rawLocation, url)
        : null;

      const rawContentType = error.response.headers['content-type'] || 'desconhecido';
      const contentType = Array.isArray(rawContentType)
        ? rawContentType[0].split(';')[0].trim()
        : rawContentType.split(';')[0].trim();

      if (error.response.data && typeof error.response.data.destroy === 'function') {
        error.response.data.destroy();
      }

      return {
        url,
        status,
        statusText: error.response.statusText || String(status),
        location,
        responseTime,
        contentType,
        source: 'local'
      };
    }

    return {
      url,
      status: 0,
      statusText: error.code || error.message || 'Falha de rede ou timeout',
      location: null,
      responseTime,
      contentType: 'indisponivel',
      source: 'local'
    };
  }
}
