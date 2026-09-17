/**
 * src/components/ResultsTable.jsx
 *
 * Tabela de resultados de auditoria com ordenação por severidade,
 * badges dinâmicos de status e exibição do destino de redirecionamento.
 */

import React from 'react';

/**
 * Retorna a classe CSS correspondente para a pílula de status.
 * @param {number} status
 * @returns {string}
 */
function getStatusClass(status) {
  if (status >= 200 && status < 300) return 'status-2xx';
  if (status >= 300 && status < 400) return 'status-3xx';
  if (status >= 400 && status < 500) return 'status-4xx';
  if (status >= 500 && status < 600) return 'status-5xx';
  return 'status-0';
}

export function ResultsTable({ results, isRunning }) {
  if (results.length === 0) {
    return (
      <div className="card empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', color: 'var(--color-neutral-500)' }}>
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p style={{ fontWeight: 500 }}>
          {isRunning ? 'Carregando dados da verificação...' : 'Nenhuma URL encontrada para os filtros aplicados.'}
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th style={{ width: '120px', textAlign: 'center' }}>Status</th>
              <th>URL Auditada</th>
              <th>Content-Type</th>
              <th style={{ width: '110px', textAlign: 'right' }}>Latência</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Origem</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row, index) => {
              const statusClass = getStatusClass(row.status);
              const isRedirect = row.status >= 300 && row.status < 400;

              return (
                <tr key={`${row.url}-${index}`}>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`status-pill ${statusClass}`}>
                      {row.status === 0 ? 'FALHA' : row.status}
                    </span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-neutral-500)', marginTop: '2px' }}>
                      {row.statusText || (row.status === 0 ? 'Indisponível' : '')}
                    </div>
                  </td>

                  <td className="url-cell">
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="url-link"
                      title={row.url}
                    >
                      {row.url}
                    </a>

                    {/* Exibe o destino real do redirecionamento 3xx */}
                    {isRedirect && row.location && (
                      <div className="redirect-target" title={`Redireciona para: ${row.location}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                        <span>
                          <strong>Destino:</strong>{' '}
                          <a href={row.location} target="_blank" rel="noopener noreferrer" style={{ color: '#b45309' }}>
                            {row.location}
                          </a>
                        </span>
                      </div>
                    )}
                  </td>

                  <td style={{ color: 'var(--color-neutral-600)', fontSize: '0.8rem' }}>
                    {row.contentType || 'indisponivel'}
                  </td>

                  <td style={{ textAlign: 'right', fontWeight: 500 }}>
                    {row.responseTime} ms
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <span className="source-badge">
                      {row.source || 'indisponível'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
