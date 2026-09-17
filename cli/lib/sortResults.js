/**
 * cli/lib/sortResults.js
 *
 * Módulo de ordenação de resultados por severidade de SEO e integridade:
 * 1. Erros Críticos (status 0, 5xx, 4xx)
 * 2. Redirecionamentos (3xx)
 * 3. Sucessos (2xx)
 * 4. Outros
 */

/**
 * Atribui uma pontuação de severidade numérica para cada status HTTP.
 * Menor valor = maior prioridade/urgência para resolução.
 *
 * @param {number} status
 * @returns {number}
 */
export function getSeverityRank(status) {
  if (status === 0) return 10; // Falha de rede / Timeout / Indisponível
  if (status >= 500 && status < 600) return 20; // Erros de Servidor (500, 502, 503, 504)
  if (status >= 400 && status < 500) return 30; // Erros do Cliente (404, 410, 403)
  if (status >= 300 && status < 400) return 40; // Redirecionamentos (301, 302, 307, 308)
  if (status >= 200 && status < 300) return 50; // Sucesso (200, 204)
  return 60; // Outros
}

/**
 * Ordena a lista de resultados por severidade decrescente de problemas.
 *
 * @param {Array<object>} results
 * @returns {Array<object>} Nova lista ordenada
 */
export function sortResultsBySeverity(results) {
  if (!Array.isArray(results)) return [];

  return [...results].sort((a, b) => {
    const rankA = getSeverityRank(a.status);
    const rankB = getSeverityRank(b.status);

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    // Desempate por código de status numérico decrescente se aplicável
    if (a.status !== b.status) {
      return b.status - a.status;
    }

    // Desempate alfabético pela URL
    return (a.url || '').localeCompare(b.url || '');
  });
}
