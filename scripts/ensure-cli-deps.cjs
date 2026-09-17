/**
 * scripts/ensure-cli-deps.cjs
 *
 * Garante que o motor backend (cli/) possua suas dependências instaladas
 * de forma autônoma e transparente antes da execução do servidor ou dev.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const rootDir = path.resolve(__dirname, '..');
const cliDir = path.join(rootDir, 'cli');
const cliNodeModules = path.join(cliDir, 'node_modules');
const reportsDir = path.join(cliDir, 'reports');

console.log('[ensure-cli-deps] Verificando integridade das dependências do motor CLI...');

// Garante que o diretório de relatórios exista
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

if (!fs.existsSync(cliNodeModules)) {
  console.log('[ensure-cli-deps] Dependências de cli/node_modules não encontradas.');
  console.log('[ensure-cli-deps] Executando "npm install" em cli/...');
  try {
    execSync('npm install', {
      cwd: cliDir,
      stdio: 'inherit'
    });
    console.log('[ensure-cli-deps] Dependências do motor CLI instaladas com sucesso.');
  } catch (error) {
    console.error('[ensure-cli-deps] Falha ao instalar dependências em cli/:', error.message);
    process.exit(1);
  }
} else {
  console.log('[ensure-cli-deps] cli/node_modules já existe. Prosseguindo.');
}
