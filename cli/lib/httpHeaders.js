/**
 * cli/lib/httpHeaders.js
 *
 * Simula cabeçalhos realistas de navegação de um browser moderno (Chrome 120)
 * para minimizar falsos positivos causados por bloqueios anti-bot / WAF.
 */

/**
 * Retorna cabeçalhos simulando o Google Chrome 120 no macOS.
 * @param {string} [targetUrl] - URL de destino para calcular Referer quando apropriado.
 * @returns {Record<string, string>} Cabeçalhos HTTP para uso em requisições.
 */
export function getBrowserLikeHeaders(targetUrl) {
  let referer = 'https://www.google.com/';
  if (targetUrl) {
    try {
      const parsed = new URL(targetUrl);
      referer = `${parsed.protocol}//${parsed.host}/`;
    } catch {
      // Caso URL seja inválida, mantém fallback
    }
  }

  return {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"macOS"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Referer': referer,
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };
}
