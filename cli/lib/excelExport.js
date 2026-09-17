/**
 * cli/lib/excelExport.js
 *
 * Gera relatórios de auditoria em formato XLSX com estilização profissional:
 * - Cabeçalho azul/indigo com tipografia em negrito e contraste branco.
 * - Painel congelado na linha 1.
 * - Auto-filtro ativado em todas as colunas.
 * - Aba de Resumo consolidando métricas chave de SEO e integridade HTTP.
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultReportsDir = path.resolve(__dirname, '../reports');

/**
 * Retorna as cores de preenchimento e fonte com base no status HTTP.
 * @param {number} status
 * @returns {{ bg: string, text: string }}
 */
function getStatusTheme(status) {
  if (status >= 200 && status < 300) {
    return { bg: 'FFD1FADF', text: 'FF027A48' }; // Verde sucesso
  }
  if (status >= 300 && status < 400) {
    return { bg: 'FFFEF3C7', text: 'FFB45309' }; // Amarelo/Âmbar redirecionamento
  }
  if (status >= 400 && status < 500) {
    return { bg: 'FFFEE2E2', text: 'FFB91C1C' }; // Vermelho erro cliente
  }
  if (status >= 500 && status < 600) {
    return { bg: 'FFFCE7F3', text: 'FF9D174D' }; // Magenta/Vermelho servidor
  }
  return { bg: 'FFF1F5F9', text: 'FF475569' }; // Cinza falha de rede/0
}

/**
 * Formata um timestamp para nome de arquivo ISO seguro (ex: 2026-09-16_22-10-00).
 * @param {Date} [date]
 * @returns {string}
 */
function getFormattedTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}-${m}-${d}_${h}-${min}-${s}`;
}

/**
 * Exporta os resultados da auditoria para uma planilha Excel estilizada.
 *
 * @param {Array<object>} results - Lista de resultados das URLs.
 * @param {object} [options]
 * @param {string} [options.outputDir] - Diretório de destino (padrão: cli/reports).
 * @param {string} [options.fileName] - Nome personalizado do arquivo.
 * @param {string} [options.sitemapUrl] - URL do sitemap auditado.
 * @returns {Promise<string>} Caminho absoluto do arquivo XLSX gerado.
 */
export async function exportResultsToExcel(results = [], options = {}) {
  const reportsDir = options.outputDir || defaultReportsDir;

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestampStr = getFormattedTimestamp();
  const fileName = options.fileName || `sitemap-health_${timestampStr}.xlsx`;
  const filePath = path.join(reportsDir, fileName);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sitemap Health Checker';
  workbook.created = new Date();

  // ----------------------------------------------------
  // ABA 1: RESULTADOS
  // ----------------------------------------------------
  const sheetResults = workbook.addWorksheet('Resultados', {
    views: [{ state: 'frozen', ySplit: 1, activeCell: 'A2' }]
  });

  sheetResults.columns = [
    { header: 'URL Verificada', key: 'url', width: 55 },
    { header: 'Status HTTP', key: 'status', width: 14 },
    { header: 'Mensagem', key: 'statusText', width: 22 },
    { header: 'Destino Redirecionamento (Location)', key: 'location', width: 55 },
    { header: 'Content-Type', key: 'contentType', width: 26 },
    { header: 'Tempo (ms)', key: 'responseTime', width: 15 },
    { header: 'Origem da Checagem', key: 'source', width: 20 }
  ];

  sheetResults.autoFilter = { from: 'A1', to: 'G1' };

  // Estilização do cabeçalho da Aba 1 (Azul/Indigo em negrito)
  const headerRow = sheetResults.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4338CA' } // Indigo moderno
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: false
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF312E81' } },
      bottom: { style: 'medium', color: { argb: 'FF312E81' } }
    };
  });

  // Linhas de dados
  results.forEach((row, index) => {
    const rowNumber = index + 2;
    const addedRow = sheetResults.addRow({
      url: row.url || '',
      status: row.status ?? 0,
      statusText: row.statusText || (row.status === 0 ? 'Indisponível' : ''),
      location: row.location || '-',
      contentType: row.contentType || 'indisponivel',
      responseTime: row.responseTime ?? 0,
      source: row.source || 'local'
    });

    addedRow.height = 22;

    const theme = getStatusTheme(row.status);

    // Formata cada célula
    addedRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFF1F5F9' } }
      };

      // Coluna Status (coluna 2): Badge colorido
      if (colNumber === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: theme.text } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.bg } };
      }

      // Coluna Tempo de resposta (coluna 6): Numérico à direita
      if (colNumber === 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0';
      }

      // Coluna Origem (coluna 7): Centralizado
      if (colNumber === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
  });

  // ----------------------------------------------------
  // ABA 2: RESUMO E MÉTRICAS
  // ----------------------------------------------------
  const sheetSummary = workbook.addWorksheet('Resumo');
  sheetSummary.views = [{ showGridLines: true }];

  sheetSummary.columns = [
    { key: 'metric', width: 34 },
    { key: 'value', width: 25 },
    { key: 'notes', width: 30 }
  ];

  // Cálculo das métricas
  const total = results.length;
  const count2xx = results.filter((r) => r.status >= 200 && r.status < 300).length;
  const count3xx = results.filter((r) => r.status >= 300 && r.status < 400).length;
  const count4xx = results.filter((r) => r.status >= 400 && r.status < 500).length;
  const count5xx = results.filter((r) => r.status >= 500 && r.status < 600).length;
  const count0 = results.filter((r) => !r.status || r.status === 0).length;

  const totalTime = results.reduce((acc, curr) => acc + (curr.responseTime || 0), 0);
  const avgResponseTime = total > 0 ? Math.round(totalTime / total) : 0;
  const healthRate = total > 0 ? ((count2xx / total) * 100).toFixed(1) + '%' : '0%';

  // Título da aba resumo
  sheetSummary.addRow([]);
  const titleRow = sheetSummary.addRow(['Relatório de Saúde do Sitemap', '', '']);
  titleRow.height = 30;
  sheetSummary.mergeCells('A2:C2');
  titleRow.getCell(1).font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1E1B4B' } };
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  sheetSummary.addRow([]);

  // Cabeçalho da tabela de resumo
  const summaryHeader = sheetSummary.addRow(['Métrica de Integridade', 'Valor', 'Status / Observação']);
  summaryHeader.height = 24;
  summaryHeader.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  const summaryData = [
    ['Sitemap Auditado', options.sitemapUrl || 'Auditoria Manual', 'URL Base'],
    ['Data e Hora da Verificação', new Date().toLocaleString('pt-BR'), 'Timestamp'],
    ['Total de URLs Analisadas', total, '100% da amostra'],
    ['URLs Válidas / Sucesso (2xx)', count2xx, count2xx === total ? 'Perfeito' : 'OK'],
    ['Redirecionamentos (3xx)', count3xx, count3xx > 0 ? 'Atenção para links diretos' : 'Zero redirecionamentos'],
    ['Erros do Cliente (4xx)', count4xx, count4xx > 0 ? 'Crítico: Links quebrados' : 'Nenhum 4xx'],
    ['Erros do Servidor (5xx)', count5xx, count5xx > 0 ? 'Crítico: Queda/Instabilidade' : 'Nenhum 5xx'],
    ['Falhas de Rede / Indisponível (0)', count0, count0 > 0 ? 'Inacessível ou Timeout' : 'Nenhuma falha'],
    ['Taxa de Integridade (2xx)', healthRate, 'URLs 2xx / Total'],
    ['Tempo Médio de Resposta', `${avgResponseTime} ms`, 'Latência média']
  ];

  summaryData.forEach(([metric, val, note]) => {
    const r = sheetSummary.addRow([metric, val, note]);
    r.height = 22;
    r.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      if (colNumber === 1) cell.font = { name: 'Calibri', size: 10, bold: true };
    });
  });

  await workbook.xlsx.writeFile(filePath);
  return filePath;
}
