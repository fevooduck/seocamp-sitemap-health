/**
 * src/components/MetricCards.jsx
 *
 * Cards de indicadores numéricos reais de integridade do sitemap.
 */

import React from 'react';

export function MetricCards({ metrics }) {
  const { total, count2xx, count3xx, count4xx, count5xx, count0, avgLatency } = metrics;

  return (
    <div className="metrics-grid">
      <div className="metric-card neutral">
        <span className="metric-label">Total Verificado</span>
        <span className="metric-value">{total}</span>
      </div>

      <div className="metric-card success">
        <span className="metric-label">Sucesso (2xx)</span>
        <span className="metric-value">{count2xx}</span>
      </div>

      <div className="metric-card warning">
        <span className="metric-label">Redirecionamento (3xx)</span>
        <span className="metric-value">{count3xx}</span>
      </div>

      <div className="metric-card error">
        <span className="metric-label">Erro Cliente (4xx)</span>
        <span className="metric-value">{count4xx}</span>
      </div>

      <div className="metric-card error">
        <span className="metric-label">Erro Servidor (5xx)</span>
        <span className="metric-value">{count5xx}</span>
      </div>

      <div className="metric-card neutral">
        <span className="metric-label">Indisponível (0)</span>
        <span className="metric-value">{count0}</span>
      </div>

      <div className="metric-card neutral">
        <span className="metric-label">Tempo Médio</span>
        <span className="metric-value" style={{ fontSize: '1.4rem' }}>{avgLatency}ms</span>
      </div>
    </div>
  );
}
