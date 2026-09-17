/**
 * src/components/ExportActions.jsx
 *
 * Barra de botões para download de relatórios em CSV, JSON ou XLSX.
 */

import React, { useState } from 'react';
import { exportToCsv, exportToJson } from '../utils/exportHelpers.js';
import { exportExcelViaBackend } from '../services/backendApi.js';

export function ExportActions({ results, sitemapUrl, isServerOnline }) {
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const [xlsxMessage, setXlsxMessage] = useState('');

  if (!results || results.length === 0) return null;

  const handleExportCsv = () => {
    exportToCsv(results, 'sitemap-audit');
  };

  const handleExportJson = () => {
    exportToJson(results, 'sitemap-audit');
  };

  const handleExportXlsx = async () => {
    if (!isServerOnline) return;
    setIsExportingXlsx(true);
    setXlsxMessage('');
    try {
      const filePath = await exportExcelViaBackend(results, sitemapUrl);
      setXlsxMessage(`✓ Planilha gerada com sucesso: ${filePath}`);
    } catch (err) {
      setXlsxMessage(`Erro ao exportar Excel: ${err.message}`);
    } finally {
      setIsExportingXlsx(false);
    }
  };

  return (
    <div className="card" style={{ padding: 'var(--spacing-md)' }}>
      <div className="action-bar">
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-neutral-600)' }}>
          Exportar Relatório ({results.length} registros auditados):
        </span>

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
          <button type="button" onClick={handleExportCsv} className="btn btn-outline btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Baixar CSV</span>
          </button>

          <button type="button" onClick={handleExportJson} className="btn btn-outline btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Baixar JSON</span>
          </button>

          {isServerOnline && (
            <button
              type="button"
              onClick={handleExportXlsx}
              disabled={isExportingXlsx}
              className="btn btn-primary btn-sm"
              title="Gera planilha Excel profissional com estilos, filtros e aba de resumo no servidor"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span>{isExportingXlsx ? 'Gerando XLSX...' : 'Gerar Excel (.xlsx no servidor)'}</span>
            </button>
          )}
        </div>
      </div>

      {xlsxMessage && (
        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: xlsxMessage.startsWith('✓') ? 'var(--color-success)' : 'var(--color-error)' }}>
          {xlsxMessage}
        </div>
      )}
    </div>
  );
}
