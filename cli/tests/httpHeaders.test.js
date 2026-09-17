/**
 * cli/tests/httpHeaders.test.js
 *
 * Teste unitário para validação de cabeçalhos de navegação Chrome 120.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { getBrowserLikeHeaders } from '../lib/httpHeaders.js';

test('httpHeaders - deve gerar cabeçalhos contendo Chrome 120 e parâmetros esperados', () => {
  const headers = getBrowserLikeHeaders('https://example.com/artigos/seo');

  assert.ok(headers['User-Agent'].includes('Chrome/120'), 'Deve conter Chrome/120 no User-Agent');
  assert.ok(headers['Accept'].includes('application/xml'), 'Deve aceitar XML');
  assert.ok(headers['Accept-Language'].includes('pt-BR'), 'Deve incluir preferência pt-BR');
  assert.equal(headers['Referer'], 'https://example.com/', 'Deve derivar o Referer da origin');
  assert.equal(headers['Sec-Fetch-Mode'], 'navigate');
});

test('httpHeaders - deve usar fallback quando URL for inválida', () => {
  const headers = getBrowserLikeHeaders('url-invalida');
  assert.equal(headers['Referer'], 'https://www.google.com/');
});
