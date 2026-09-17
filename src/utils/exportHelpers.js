/**
 * src/utils/exportHelpers.js
 *
 * Funções utilitárias para ordenação por severidade e download de relatórios CSV / JSON no cliente.
 */

/**
 * Retorna o peso de severidade do status HTTP.
 * @param {number} status
 * @returns {number}
 */
export function getSeverityRank(status) {
  if (status === 0) return 10;
  if (status >= 500 && status < 600) return 20;
  if (status >= 400 && status < 500) return 30;
  if (status >= 300 && status < 400) return 40;
  if (status >= 200 && status < 300) return 50;
  return 60;
}

/**
 * Ordena resultados colocando falhas críticas e erros primeiro, depois redirecionamentos, depois sucessos.
 * @param {Array<object>} results
 * @returns {Array<object>}
 */
export function sortResultsBySeverity(results) {
  if (!Array.isArray(results)) return [];

  return [...results].sort((a, b) => {
    const rankA = getSeverityRank(a.status);
    const rankB = getSeverityRank(b.status);

    if (rankA !== rankB) {
      return rankA - rankB;
    }
    if (a.status !== b.status) {
      return b.status - a.status;
    }
    return (a.url || '').localeCompare(b.url || '');
  });
}

/**
 * Dispara o download de um arquivo gerado no navegador.
 * @param {Blob} blob
 * @param {string} fileName
 */
function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta os resultados auditados para formato CSV.
 * @param {Array<object>} results
 * @param {string} [baseName='sitemap-audit']
 */
export function exportToCsv(results, baseName = 'sitemap-audit') {
  if (!results || results.length === 0) return;

  const headers = ['URL', 'Status HTTP', 'Mensagem', 'Destino Redirecionamento', 'Content-Type', 'Tempo (ms)', 'Origem'];
  const rows = results.map((r) => [
    `"${(r.url || '').replace(/"/g, '""')}"`,
    r.status ?? 0,
    `"${(r.statusText || '').replace(/"/g, '""')}"`,
    `"${(r.location || '').replace(/"/g, '""')}"`,
    `"${(r.contentType || '').replace(/"/g, '""')}"`,
    r.responseTime ?? 0,
    `"${(r.source || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${baseName}-${Date.now()}.csv`);
}

/**
 * Exporta os resultados auditados para formato JSON.
 * @param {Array<object>} results
 * @param {string} [baseName='sitemap-audit']
 */
export function exportToJson(results, baseName = 'sitemap-audit') {
  if (!results || results.length === 0) return;

  const jsonString = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      total: results.length,
      results
    },
    null,
    2
  );

  const blob = new Blob([jsonString], { type: 'application/json' });
  triggerDownload(blob, `${baseName}-${Date.now()}.json`);
}
