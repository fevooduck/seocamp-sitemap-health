/**
 * src/components/AdvancedOptions.jsx
 *
 * Painel de opções avançadas de auditoria.
 */

import React from 'react';

export function AdvancedOptions({
  isOpen,
  concurrency,
  setConcurrency,
  timeout,
  setTimeoutMs,
  allowDirectFetch,
  setAllowDirectFetch,
  useLocalServer
}) {
  if (!isOpen) return null;

  return (
    <div className="advanced-box">
      <div className="advanced-grid">
        <div className="field-group">
          <label className="field-label">Concorrência de Requisições:</label>
          <select
            className="field-select"
            value={concurrency}
            onChange={(e) => setConcurrency(Number(e.target.value))}
          >
            <option value={1}>1 conexão (Mais lenta / Mais segura)</option>
            <option value={3}>3 conexões simultâneas</option>
            <option value={5}>5 conexões simultâneas (Padrão)</option>
            <option value={8}>8 conexões simultâneas</option>
            <option value={10}>10 conexões simultâneas (Rápida)</option>
          </select>
        </div>

        <div className="field-group">
          <label className="field-label">Timeout por URL (ms):</label>
          <input
            type="number"
            className="field-input-number"
            value={timeout}
            step={1000}
            min={2000}
            max={30000}
            onChange={(e) => setTimeoutMs(Number(e.target.value))}
          />
        </div>

        {!useLocalServer && (
          <div className="field-group" style={{ justifyContent: 'center' }}>
            <label className="toggle-wrapper" title="Desativado por padrão para evitar poluir o console do navegador com erros de CORS">
              <input
                type="checkbox"
                className="checkbox-custom"
                checked={allowDirectFetch}
                onChange={(e) => setAllowDirectFetch(e.target.checked)}
              />
              <span>Tentar fetch direto antes do proxy</span>
            </label>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-neutral-500)' }}>
              (Desativado por padrão para não poluir o DevTools com erros de CORS)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
