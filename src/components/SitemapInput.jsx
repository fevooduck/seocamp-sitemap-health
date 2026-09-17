/**
 * src/components/SitemapInput.jsx
 *
 * Formulário para inserção da URL do sitemap, toggle do servidor local e gatilho de auditoria.
 */

import React from 'react';

export function SitemapInput({
  url,
  setUrl,
  isRunning,
  onStart,
  onCancel,
  useLocalServer,
  setUseLocalServer,
  isServerOnline,
  showAdvanced,
  setShowAdvanced
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isRunning) {
      onStart();
    }
  };

  return (
    <div className="card">
      <form className="input-form" onSubmit={handleSubmit}>
        <div className="input-row">
          <input
            type="url"
            required
            className="input-text"
            placeholder="Insira a URL do sitemap (ex: https://meusite.com/sitemap.xml)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isRunning}
          />

          {!isRunning ? (
            <button type="submit" className="btn btn-primary" disabled={!url.trim()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span>Analisar Sitemap</span>
            </button>
          ) : (
            <button type="button" onClick={onCancel} className="btn btn-danger">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="6" width="12" height="12"></rect>
              </svg>
              <span>Interromper</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="btn btn-outline"
            title="Configurações de concorrência e rede"
          >
            ⚙️ Opções
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <label className="toggle-wrapper" title="Delega a extração e a checagem HTTP ao motor Node Express (porta 4000), contornando CORS e capturando o 3xx exato">
            <input
              type="checkbox"
              className="checkbox-custom"
              checked={useLocalServer}
              disabled={!isServerOnline || isRunning}
              onChange={(e) => setUseLocalServer(e.target.checked)}
            />
            <span>
              {isServerOnline
                ? '🟢 Servidor local conectado — usar (Recomendado: sem restrição CORS e 3xx preciso)'
                : '⚪ Servidor local desconectado — usando cascata de proxies no navegador'}
            </span>
          </label>
        </div>
      </form>
    </div>
  );
}
