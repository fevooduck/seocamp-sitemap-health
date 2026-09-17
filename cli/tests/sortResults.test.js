/**
 * cli/tests/sortResults.test.js
 *
 * Teste unitário para validação de ordenação por severidade de SEO.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { sortResultsBySeverity, getSeverityRank } from '../lib/sortResults.js';

test('sortResults - deve pontuar severidade conforme hierarquia exigida', () => {
  assert.equal(getSeverityRank(0), 10, 'Status 0 tem máxima prioridade');
  assert.equal(getSeverityRank(500), 20, '5xx tem prioridade 20');
  assert.equal(getSeverityRank(404), 30, '4xx tem prioridade 30');
  assert.equal(getSeverityRank(301), 40, '3xx tem prioridade 40');
  assert.equal(getSeverityRank(200), 50, '2xx tem prioridade 50');
});

test('sortResults - deve ordenar itens colocando erros na frente, depois 3xx, depois 2xx', () => {
  const input = [
    { url: 'https://site.com/sucesso-2', status: 200 },
    { url: 'https://site.com/redirect', status: 301 },
    { url: 'https://site.com/erro-500', status: 500 },
    { url: 'https://site.com/sucesso-1', status: 200 },
    { url: 'https://site.com/falha-rede', status: 0 },
    { url: 'https://site.com/erro-404', status: 404 }
  ];

  const sorted = sortResultsBySeverity(input);

  assert.equal(sorted[0].status, 0, 'Primeiro item deve ser status 0');
  assert.equal(sorted[1].status, 500, 'Segundo item deve ser status 500');
  assert.equal(sorted[2].status, 404, 'Terceiro item deve ser status 404');
  assert.equal(sorted[3].status, 301, 'Quarto item deve ser status 301');
  assert.equal(sorted[4].status, 200, 'Quinto item deve ser status 200');
  assert.equal(sorted[5].status, 200, 'Sexto item deve ser status 200');
});
