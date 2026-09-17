/**
 * src/components/ProgressBar.jsx
 *
 * Barra de progresso visual com contadores e status dinâmico.
 */

import React from 'react';

export function ProgressBar({ isRunning, current, total, percentage, currentUrl, phaseMessage }) {
  if (!isRunning && total === 0) return null;

  return (
    <div className="card" style={{ padding: 'var(--spacing-md)' }}>
      <div className="progress-container">
        <div className="progress-meta">
          <span style={{ fontWeight: 600, color: 'var(--color-neutral-800)' }}>
            {phaseMessage || (isRunning ? 'Verificando URLs em tempo real...' : 'Auditoria concluída')}
          </span>
          <span style={{ fontWeight: 600 }}>
            {current} de {total} ({percentage}%)
          </span>
        </div>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
        </div>

        {currentUrl && (
          <div className="current-url-display" title={currentUrl}>
            <span style={{ fontWeight: 600 }}>Checando: </span>
            {currentUrl}
          </div>
        )}
      </div>
    </div>
  );
}
