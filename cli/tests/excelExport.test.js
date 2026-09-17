/**
 * cli/tests/excelExport.test.js
 *
 * Teste unitário para validação da geração e estilização da planilha Excel com ExcelJS.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { exportResultsToExcel } from '../lib/excelExport.js';

test('excelExport - deve gerar planilha com abas Resultados e Resumo formatadas', async (t) => {
  const tmpDir = path.resolve('./cli/reports/test-output');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const sampleResults = [
    {
      url: 'https://example.com/artigo-1',
      status: 200,
      statusText: 'OK',
      location: null,
      contentType: 'text/html',
      responseTime: 120,
      source: 'local'
    },
    {
      url: 'https://example.com/artigo-antigo',
      status: 301,
      statusText: 'Moved Permanently',
      location: 'https://example.com/artigo-novo',
      contentType: 'text/html',
      responseTime: 85,
      source: 'local'
    },
    {
      url: 'https://example.com/artigo-inexistente',
      status: 404,
      statusText: 'Not Found',
      location: null,
      contentType: 'text/html',
      responseTime: 95,
      source: 'local'
    }
  ];

  const filePath = await exportResultsToExcel(sampleResults, {
    outputDir: tmpDir,
    fileName: 'test-export.xlsx',
    sitemapUrl: 'https://example.com/sitemap.xml'
  });

  t.after(() => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    if (fs.existsSync(tmpDir)) {
      fs.rmdirSync(tmpDir);
    }
  });

  assert.ok(fs.existsSync(filePath), 'Arquivo XLSX deve ter sido gravado');

  // Lê o workbook de volta para validar estrutura
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheetResults = workbook.getWorksheet('Resultados');
  const sheetSummary = workbook.getWorksheet('Resumo');

  assert.ok(sheetResults, 'Worksheet "Resultados" deve existir');
  assert.ok(sheetSummary, 'Worksheet "Resumo" deve existir');

  // Valida cabeçalho da linha 1
  const headerCell = sheetResults.getCell('A1');
  assert.equal(headerCell.value, 'URL Verificada');
  assert.equal(headerCell.font.bold, true);
  assert.equal(headerCell.fill.fgColor.argb, 'FF4338CA');

  // Valida congelamento da linha 1
  const views = sheetResults.views;
  assert.ok(views && views.length > 0);
  assert.equal(views[0].state, 'frozen');
  assert.equal(views[0].ySplit, 1);

  // Valida quantidade de linhas de dados
  assert.equal(sheetResults.rowCount, 4); // 1 header + 3 rows
});
