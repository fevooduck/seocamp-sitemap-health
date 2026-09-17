/**
 * src/components/Header.jsx
 *
 * Cabeçalho principal com logotipos do SEOcamp 2026, Educa SEO e monitor de status do servidor.
 */

import React from 'react';

export function Header({ isServerOnline, isCheckingServer, onRefreshHealth }) {
  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <a
          href="https://www.seocamp.com.br"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}
          title="SEOcamp 2026 — www.seocamp.com.br"
        >
          <img
            src="/assets/seo_camp_logo.png"
            alt="SEOcamp 2026"
            style={{ height: '36px', objectFit: 'contain' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <img
            src="/assets/educa_seo_logo.png"
            alt="Educa SEO"
            style={{ height: '34px', objectFit: 'contain' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </a>

        <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--color-neutral-200)' }} />

        <div className="brand-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          <span style={{ fontSize: '1.25rem' }}>Sitemap Health Checker</span>
          <span className="brand-badge">SEOCAMP 2026</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className="server-status-pill" title={isServerOnline ? 'Servidor local Express ativo na porta 4000' : 'Servidor Express local offline (usando proxies CORS)'}>
          <span className={`server-dot ${isServerOnline ? 'online' : 'offline'}`} />
          <span>
            {isCheckingServer
              ? 'Verificando motor local...'
              : isServerOnline
              ? 'Servidor local conectado (:4000)'
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
