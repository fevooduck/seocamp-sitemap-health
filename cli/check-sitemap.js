#!/usr/bin/env node

/**
 * cli/check-sitemap.js
 *
 * Ferramenta de linha de comando (CLI) para auditoria de saúde de sitemaps:
 * - Aceita URL como argumento de linha de comando ou via prompt interativo readline.
 * - Extrai URLs recursivamente de sitemapindex e urlset.
 * - Checa status HTTP com concorrência e jitter.
 * - Ordena por severidade (erros -> 3xx -> 2xx).
 * - Exibe progresso no terminal e gera relatório Excel (.xlsx) estilizado.
 */

import readline from 'node:readline';
import { extractUrlsFromSitemap } from './lib/sitemap.js';
import { checkUrlHealth } from './lib/health.js';
import { runConcurrentTasks } from './lib/concurrency.js';
import { sortResultsBySeverity } from './lib/sortResults.js';
import { exportResultsToExcel } from './lib/excelExport.js';

// Cores ANSI para saída no terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

/**
 * Solicita entrada interativa do usuário via terminal.
 * @param {string} questionText
 * @returns {Promise<string>}
 */
function promptUser(questionText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(questionText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Retorna tag de status colorida para o console.
 * @param {number} status
 * @returns {string}
 */
function formatStatusTag(status) {
  if (status >= 200 && status < 300) {
    return `${colors.green}${status} OK${colors.reset}`;
  }
  if (status >= 300 && status < 400) {
    return `${colors.yellow}${status} REDIRECT${colors.reset}`;
  }
  if (status >= 400 && status < 500) {
    return `${colors.red}${status} CLIENT_ERR${colors.reset}`;
  }
  if (status >= 500) {
    return `${colors.magenta}${status} SERVER_ERR${colors.reset}`;
  }
  return `${colors.red}0 FALHA${colors.reset}`;
}

async function main() {
  console.log(`\n${colors.bright}${colors.blue}=== Sitemap Health Checker CLI ===${colors.reset}\n`);

  let targetUrl = process.argv[2]?.trim();

  if (!targetUrl) {
    targetUrl = await promptUser(`${colors.cyan}? Digite a URL do sitemap XML: ${colors.reset}`);
  }

  if (!targetUrl) {
    console.error(`${colors.red}Erro: Nenhuma URL informada. Abortando.${colors.reset}`);
    process.exit(1);
  }

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = `https://${targetUrl}`;
  }

  console.log(`\n${colors.bright}Iniciando auditoria para:${colors.reset} ${colors.cyan}${targetUrl}${colors.reset}`);
  console.log(`${colors.gray}Baixando e analisando estrutura do XML...${colors.reset}`);

  const startTime = Date.now();
  let urls = [];

  try {
    urls = await extractUrlsFromSitemap(targetUrl);
  } catch (err) {
    console.error(`\n${colors.red}Falha ao processar sitemap:${colors.reset} ${err.message}`);
    process.exit(1);
  }

  if (urls.length === 0) {
    console.warn(`\n${colors.yellow}Nenhuma URL válida encontrada no sitemap.${colors.reset}`);
    process.exit(0);
  }

  console.log(`${colors.green}✓ Extraídas ${urls.length} URLs únicas.${colors.reset}`);
  console.log(`\n${colors.bright}Iniciando verificação de integridade HTTP (5 conexões simultâneas com jitter)...${colors.reset}\n`);

  const results = [];

  await runConcurrentTasks(
    urls,
    async (url) => {
      return await checkUrlHealth(url);
    },
    {
      concurrency: 5,
      minJitter: 20,
      maxJitter: 100,
      onProgress: ({ current, total, result, percentage }) => {
        results.push(result);
        const tag = formatStatusTag(result.status);
        const ms = `${result.responseTime}ms`;
        const redirectInfo = result.location ? ` -> ${colors.yellow}${result.location}${colors.reset}` : '';
        const shortUrl = result.url.length > 60 ? result.url.slice(0, 57) + '...' : result.url;

        process.stdout.write(
          `\r[${colors.cyan}${current}/${total}${colors.reset}] (${percentage}%) [${tag}] ${colors.dim}${ms}${colors.reset} ${shortUrl}${redirectInfo}\x1b[K\n`
        );
      }
    }
  );

  const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

  // Ordena por severidade (erros primeiro, 3xx depois, 2xx por último)
  const sortedResults = sortResultsBySeverity(results);

  // Métricas
  const total = sortedResults.length;
  const count2xx = sortedResults.filter((r) => r.status >= 200 && r.status < 300).length;
  const count3xx = sortedResults.filter((r) => r.status >= 300 && r.status < 400).length;
  const count4xx = sortedResults.filter((r) => r.status >= 400 && r.status < 500).length;
  const count5xx = sortedResults.filter((r) => r.status >= 500 && r.status < 600).length;
  const count0 = sortedResults.filter((r) => !r.status || r.status === 0).length;
  const avgLatency = Math.round(sortedResults.reduce((acc, r) => acc + (r.responseTime || 0), 0) / (total || 1));

  console.log(`\n${colors.bright}${colors.blue}=== Resumo da Auditoria ===${colors.reset}`);
  console.log(`Total de URLs:          ${colors.bright}${total}${colors.reset}`);
  console.log(`Sucesso (2xx):          ${colors.green}${count2xx}${colors.reset}`);
  console.log(`Redirecionamentos (3xx): ${colors.yellow}${count3xx}${colors.reset}`);
  console.log(`Erros do Cliente (4xx): ${colors.red}${count4xx}${colors.reset}`);
  console.log(`Erros de Servidor (5xx): ${colors.magenta}${count5xx}${colors.reset}`);
  console.log(`Falhas de Rede (0):     ${colors.red}${count0}${colors.reset}`);
  console.log(`Tempo Médio de Resposta: ${avgLatency}ms`);
  console.log(`Duração Total:          ${durationSeconds}s`);

  console.log(`\n${colors.gray}Gerando planilha Excel estilizada...${colors.reset}`);

  try {
    const reportPath = await exportResultsToExcel(sortedResults, { sitemapUrl: targetUrl });
    console.log(`\n${colors.green}${colors.bright}✓ Relatório Excel gerado com sucesso em:${colors.reset}`);
    console.log(`${colors.cyan}${reportPath}${colors.reset}\n`);
  } catch (err) {
    console.error(`${colors.red}Erro ao gerar relatório Excel:${colors.reset} ${err.message}`);
  }
}

main().catch((err) => {
  console.error('\nErro inesperado no CLI:', err);
  process.exit(1);
});
