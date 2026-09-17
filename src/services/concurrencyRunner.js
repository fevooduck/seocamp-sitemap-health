/**
 * src/services/concurrencyRunner.js
 *
 * Pool de concorrência com jitter para execução no cliente (React).
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getRandomJitter = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Executa tarefas com limite de concorrência e jitter.
 *
 * @template T, R
 * @param {Array<T>} items
 * @param {(item: T, index: number) => Promise<R>} taskFn
 * @param {object} [options]
 * @param {number} [options.concurrency=5]
 * @param {number} [options.minJitter=20]
 * @param {number} [options.maxJitter=80]
 * @param {(progress: { current: number, total: number, item: T, result: R, percentage: number }) => void} [options.onProgress]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Array<R>>}
 */
export async function runClientConcurrentTasks(items, taskFn, options = {}) {
  const {
    concurrency = 5,
    minJitter = 20,
    maxJitter = 80,
    onProgress,
    signal
  } = options;

  if (!Array.isArray(items) || items.length === 0) return [];

  const total = items.length;
  const results = new Array(total);
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (nextIndex < total) {
      if (signal?.aborted) return;

      const idx = nextIndex++;
      const item = items[idx];

      const jitter = getRandomJitter(minJitter, maxJitter);
      if (jitter > 0) {
        await sleep(jitter);
      }

      if (signal?.aborted) return;

      try {
        const res = await taskFn(item, idx);
        results[idx] = res;
        completed++;

        if (typeof onProgress === 'function') {
          onProgress({
            current: completed,
            total,
            item,
            result: res,
            percentage: Math.round((completed / total) * 100)
          });
        }
      } catch (err) {
        if (signal?.aborted) return;

        const fallback = {
          url: typeof item === 'string' ? item : item?.url || '',
          status: 0,
          statusText: err.message || 'Falha de execução',
          location: null,
          responseTime: 0,
          contentType: 'indisponivel',
          source: 'unavailable'
        };
        results[idx] = fallback;
        completed++;

        if (typeof onProgress === 'function') {
          onProgress({
            current: completed,
            total,
            item,
            result: fallback,
            percentage: Math.round((completed / total) * 100)
          });
        }
      }
    }
  }

  const activeWorkers = Math.min(concurrency, total);
  const pool = Array.from({ length: activeWorkers }, () => worker());

  await Promise.all(pool);
  return results.filter(Boolean);
}
