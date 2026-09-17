/**
 * cli/lib/concurrency.js
 *
 * Executor assíncrono com limitação de concorrência e jitter aleatório
 * para proteger servidores de sobrecarga e mitigar bloqueios de rate limit.
 */

/**
 * Aguarda um período em milissegundos.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gera um jitter aleatório entre min e max milissegundos.
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const getRandomJitter = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Executa tarefas assíncronas com concorrência controlada e jitter aleatório.
 *
 * @template T, R
 * @param {Array<T>} items - Lista de itens a serem processados.
 * @param {(item: T, index: number) => Promise<R>} taskFn - Função assíncrona a executar.
 * @param {object} [options]
 * @param {number} [options.concurrency=5] - Limite de execuções simultâneas.
 * @param {number} [options.minJitter=20] - Jitter mínimo em ms.
 * @param {number} [options.maxJitter=100] - Jitter máximo em ms.
 * @param {(progress: { current: number, total: number, item: T, result: R, percentage: number }) => void} [options.onProgress] - Callback de progresso.
 * @param {AbortSignal} [options.signal] - Sinal para cancelamento.
 * @returns {Promise<Array<R>>} Lista com os resultados na ordem original ou de conclusão.
 */
export async function runConcurrentTasks(items, taskFn, options = {}) {
  const {
    concurrency = 5,
    minJitter = 20,
    maxJitter = 100,
    onProgress,
    signal
  } = options;

  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const total = items.length;
  const results = new Array(total);
  let currentIndex = 0;
  let completedCount = 0;

  async function worker() {
    while (currentIndex < total) {
      if (signal?.aborted) {
        throw new Error('Operação cancelada pelo usuário');
      }

      const itemIndex = currentIndex++;
      const item = items[itemIndex];

      // Aplica jitter aleatório antes do disparo da requisição
      const jitter = getRandomJitter(minJitter, maxJitter);
      if (jitter > 0) {
        await sleep(jitter);
      }

      if (signal?.aborted) {
        throw new Error('Operação cancelada pelo usuário');
      }

      try {
        const result = await taskFn(item, itemIndex);
        results[itemIndex] = result;
        completedCount++;

        if (typeof onProgress === 'function') {
          onProgress({
            current: completedCount,
            total,
            item,
            result,
            percentage: Math.round((completedCount / total) * 100)
          });
        }
      } catch (err) {
        if (signal?.aborted) throw err;

        // Se a taskFn falhar inesperadamente, encapsula resultado como erro
        const fallbackResult = {
          url: typeof item === 'string' ? item : item?.url || '',
          status: 0,
          statusText: err.message || 'Erro de execução na tarefa',
          location: null,
          responseTime: 0,
          contentType: 'indisponivel',
          source: 'local'
        };
        results[itemIndex] = fallbackResult;
        completedCount++;

        if (typeof onProgress === 'function') {
          onProgress({
            current: completedCount,
            total,
            item,
            result: fallbackResult,
            percentage: Math.round((completedCount / total) * 100)
          });
        }
      }
    }
  }

  const activeConcurrency = Math.min(concurrency, total);
  const workers = Array.from({ length: activeConcurrency }, () => worker());

  await Promise.all(workers);
  return results;
}
