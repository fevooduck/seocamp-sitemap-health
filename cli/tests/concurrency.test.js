/**
 * cli/tests/concurrency.test.js
 *
 * Teste unitário para o executor concorrente com jitter e progresso.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { runConcurrentTasks } from '../lib/concurrency.js';

test('concurrency - deve processar todos os itens respeitando limite e callback de progresso', async () => {
  const items = [1, 2, 3, 4, 5, 6, 7];
  let activeCount = 0;
  let maxObservedActive = 0;
  const progressCalls = [];

  const results = await runConcurrentTasks(
    items,
    async (item) => {
      activeCount++;
      maxObservedActive = Math.max(maxObservedActive, activeCount);
      await new Promise((resolve) => setTimeout(resolve, 30));
      activeCount--;
      return item * 10;
    },
    {
      concurrency: 3,
      minJitter: 5,
      maxJitter: 15,
      onProgress: (p) => progressCalls.push(p)
    }
  );

  assert.equal(results.length, 7, 'Deve retornar todos os 7 resultados');
  assert.deepEqual(results, [10, 20, 30, 40, 50, 60, 70]);
  assert.ok(maxObservedActive <= 3, `Concorrência observada (${maxObservedActive}) não deve exceder 3`);
  assert.equal(progressCalls.length, 7, 'Deve emitir progresso para cada item');
  assert.equal(progressCalls[progressCalls.length - 1].percentage, 100);
});
