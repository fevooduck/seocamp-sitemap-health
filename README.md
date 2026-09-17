# Sitemap Health Checker (Produção / Zero-Simulação)

Ferramenta profissional e de alta precisão para auditoria de integridade HTTP de sitemaps XML em produção. Desenvolvida para **zero dados simulados** — 100% dos resultados refletem verificações de rede reais.

---

## 🏗️ Arquitetura do Projeto

O projeto é dividido em duas partes estritamente isoladas em um único repositório:

1. **Frontend (React + Vite)**:
   - React 18 sem TypeScript e sem React Router (Single Page Application pura).
   - Estilização em CSS puro utilizando as custom properties de design tokens obrigatórias.
   - Cascata inteligente de fallbacks para contornar restrições de CORS do navegador.
   - Detecção automática de disponibilidade do motor local Express (:4000).
   - Exportação direta de dados em CSV, JSON e acionamento de geração de planilhas XLSX no servidor.

2. **Motor Backend & CLI (`cli/`)**:
   - Projeto Node isolado com `"type": "module"` e seu próprio `package.json`.
   - Dependências dedicadas: `express`, `cors`, `axios`, `xml2js`, `exceljs`.
   - **`cli/lib/httpHeaders.js`**: Simula Chrome 120 (macOS, sec-ch-ua, Accept-Language pt-BR).
   - **`cli/lib/sitemap.js`**: Extração recursiva de `sitemapindex` e `urlset` com retries exponenciais em HTTP 403 / 429.
   - **`cli/lib/health.js`**: Checagem com `maxRedirects: 0` e `validateStatus: () => true`, extraindo a URL exata do cabeçalho `Location` em respostas 3xx. Captura erros de rede como `status: 0`.
   - **`cli/lib/concurrency.js`**: Limitação de concorrência com jitter aleatório (20ms–100ms) para proteger servidores de bloqueio por rate limit.
   - **`cli/lib/sortResults.js`**: Ordenação estrita por severidade (Erros 4xx/5xx/0 ➔ Redirecionamentos 3xx ➔ Sucesso 2xx).
   - **`cli/lib/excelExport.js`**: Geração de relatórios XLSX estilizados via `exceljs` com cabeçalho indigo, painel congelado na linha 1, auto-filtro e aba consolidada de resumo.
   - **`cli/server.js`**: Servidor Express na porta 4000 (`/api/health`, `/api/extract-urls`, `/api/check-url`, `/api/export-excel`) com graceful exit em caso de porta ocupada (`EADDRINUSE`).
   - **`cli/check-sitemap.js`**: CLI executável autônomo com interface `readline`, progresso em tempo real e exportação de planilha.

---

## 🚀 Como Executar

### 1. Pré-requisitos
- Node.js >= 18 (Recomendado Node 20+)
- npm >= 9

### 2. Instalação
Basta clonar o repositório e executar:
```bash
npm install
```
> O script `scripts/ensure-cli-deps.cjs` será disparado automaticamente no `postinstall`, instalando todas as dependências do motor backend dentro de `cli/node_modules`.

### 3. Ambiente de Desenvolvimento (Vite + Express)
Para iniciar simultaneamente o Vite (porta 5173) e o servidor Express (porta 4000):
```bash
npm run dev
```

Abra seu navegador em: **`http://localhost:5173`**

### 4. Execução da Ferramenta CLI
Você pode auditar qualquer sitemap diretamente pelo terminal:

Com argumento direto:
```bash
node cli/check-sitemap.js https://meusite.com/sitemap.xml
```

Ou em modo interativo (solicita a URL via prompt):
```bash
node cli/check-sitemap.js
```

Os relatórios gerados pela CLI serão salvos automaticamente em `cli/reports/sitemap-health_<timestamp>.xlsx`.

---

## 🌐 Cascata de Fallbacks e CORS

Quando executado no navegador:
1. **Detecção do Servidor Local**: Ao abrir a tela, uma chamada rápida (`GET /api/health`) verifica se o Express local está ativo. Se positivo, ativa automaticamente o toggle **"🟢 Servidor local conectado — usar"**, contornando qualquer restrição de CORS e capturando o 3xx com precisão milimétrica.
2. **Download do Sitemap no Navegador**: Tenta Fetch Direto ➔ Fallback 1: `corsproxy.io` ➔ Fallback 2: `allorigins.win/raw`.
3. **Checagem de URLs no Navegador**:
   - *Fetch direto*: Desativado por padrão (para evitar poluir o console do DevTools com erros CORS). Pode ser ativado via opções avançadas.
   - *Proxy Primário*: `corsproxy.io/?<url>` (captura status real e header `X-Final-URL`).
   - *Proxy Secundário*: `allorigins.win/get?url=<url>` (lê `status.http_code`, `status.content_type`, `status.url`).
   - *Zero Dados Inventados*: Se todas as rotas falharem, a URL é registrada como `status: 0`, `source: 'unavailable'`, `contentType: 'indisponivel'`.

---

## 🧪 Testes Automatizados (TDD)

A suíte de testes utiliza o runner nativo do Node 22 (`node:test` e `node:assert`):
```bash
npm test
```

Testes cobertos:
- `cli-e2e.test.js`: Execução completa de ponta a ponta do CLI gerando arquivo XLSX no disco.
- `concurrency.test.js`: Pool de concorrência com jitter e emissão de progresso.
- `excelExport.test.js`: Criação de abas "Resultados" e "Resumo", validação de colunas, células e auto-filtro.
- `health.test.js`: Validação de 200, 301 com header `Location` resolvido, 404 e status 0 em falha de conexão.
- `httpHeaders.test.js`: Validação dos cabeçalhos Chrome 120 e referer dinâmico.
- `server.test.js`: Rotas da API Express (`/api/health`, `/api/extract-urls`, `/api/check-url`).
- `sitemap.test.js`: Parsing recursivo de `sitemapindex` aninhados e `urlset`.
- `sortResults.test.js`: Ordenação por severidade (erros ➔ 3xx ➔ 2xx).

---

## 🎨 Design Tokens (CSS Puro)

Configuração em `src/index.css`:
```css
:root {
  --color-primary: hsl(250, 84%, 54%);
  --color-secondary: hsl(280, 70%, 60%);
  --color-success: hsl(142, 76%, 36%);
  --color-success-light: hsl(142, 76%, 46%);
  --color-warning: hsl(38, 92%, 50%);
  --color-warning-light: hsl(38, 92%, 60%);
  --color-error: hsl(0, 84%, 60%);
  --color-error-light: hsl(0, 84%, 70%);
  --color-neutral-50: hsl(220, 20%, 97%);
  --color-neutral-100: hsl(220, 18%, 93%);
  --color-neutral-200: hsl(220, 16%, 85%);
  --color-neutral-500: hsl(220, 10%, 40%);
  --color-neutral-600: hsl(220, 12%, 30%);
  --color-neutral-800: hsl(220, 16%, 12%);
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -1px rgba(0,0,0,.06);
  --spacing-xs: .25rem;
  --spacing-sm: .5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
}
```
