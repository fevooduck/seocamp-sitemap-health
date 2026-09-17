/**
 * src/components/Header.jsx
 *
 * Cabeçalho principal com marca e status de conectividade do servidor backend.
 */

import React from 'react';

export function Header({ isServerOnline, isCheckingServer, onRefreshHealth }) {
  return (
    <header className="app-header">
      <div className="brand-title">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
        <span>Sitemap Health Checker</span>
        <span className="brand-badge">PRODUÇÃO</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className="server-status-pill" title={isServerOnline ? 'Servidor local Express ativo na porta 4000' : 'Servidor Express local offline (usando proxies CORS)'}>
          <span className={`server-dot ${isServerOnline ? 'online' : 'offline'}`} />
          <span>
            {isCheckingServer
              ? 'Verificando motor local...'
              : isServerOnline
              ? 'Servidor local conectado (porta 4000)'
              : 'Modo Navegador / Proxies CORS'}
          </span>
        </div>

        <button
          type="button"
          onClick={onRefreshHealth}
          disabled={isCheckingServer}
          className="btn btn-outline btn-sm"
          title="Verificar conexão com o servidor local Express"
        >
          {isCheckingServer ? '↻' : 'Testar Conexão'}
        </button>
      </div>
    </header>
  );
}
