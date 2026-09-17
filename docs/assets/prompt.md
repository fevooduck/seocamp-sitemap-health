# Prompt: Sitemap Health Checker (Produção / Zero-Simulação)

Crie a ferramenta **Sitemap Health Checker** em um único repositório com duas partes isoladas:
1. **Frontend**: React + Vite (sem TypeScript, sem React Router, página única, CSS puro com custom properties/variáveis).
2. **Motor Backend**: Projeto Node isolado (`cli/`, com seu próprio `package.json` contendo `"type": "module"` e dependências separadas) que expõe a lógica como CLI e como servidor Express local.

NENHUM DADO SIMULADO OU FABRICADO EM NENHUMA HIPÓTESE. Todo resultado deve ser fruto de uma verificação real.

---

## 🛠️ Requisitos de Arquitetura & Automação

### 1. Raiz do Projeto (`/package.json`)
- Dependências: `react`, `react-dom`, `@vitejs/plugin-react`, `concurrently`, `vite`.
- Scripts obrigatórios:
  - `"predev": "node scripts/ensure-cli-deps.cjs"`
  - `"dev": "concurrently --kill-others-on-fail --prefix name --names \"vite,server\" --prefix-colors \"cyan,magenta\" \"vite\" \"npm run server --prefix cli\""`
  - `"build": "vite build"`
  - `"preview": "concurrently \"vite preview\" \"npm run server --prefix cli\""`
  - `"postinstall": "node scripts/ensure-cli-deps.cjs"`
- **Script `scripts/ensure-cli-deps.cjs`**: Verifica se a pasta `cli/node_modules` existe. Se não existir, roda automaticamente `npm install` dentro do diretório `cli/`.

### 2. Motor Backend & CLI (`cli/`)
- Diretório `cli/` contendo `package.json` próprio com `"type": "module"` e dependências: `express`, `cors`, `axios`, `xml2js`, `exceljs`.
- **`cli/lib/httpHeaders.js`**: Exporta `getBrowserLikeHeaders(url)` simulando Chrome 120 (User-Agent, Accept, Accept-Language, Referer).
- **`cli/lib/sitemap.js`**: `extractUrlsFromSitemap(url)` usando `axios` + `xml2js`, tratando recursivamente `sitemapindex` e retries com backoff em HTTP 403.
- **`cli/lib/health.js`**: `checkUrlHealth(url)` usando `axios` com `maxRedirects: 0` e `validateStatus: () => true`. Lê o header `Location` em respostas 3xx para extrair a URL de destino exata. Erros de rede retornam `status: 0`, `source: 'local'`.
- **`cli/lib/concurrency.js`**: Execução concorrente limitada (~5 simultâneas) com jitter aleatório (20ms-100ms).
- **`cli/lib/sortResults.js`**: Ordenação por severidade (Erros 4xx/5xx/0 ➔ Redirecionamentos 3xx ➔ Sucesso 2xx).
- **`cli/lib/excelExport.js`**: Utiliza `exceljs` para gerar relatório `.xlsx` estilizado em `cli/reports/` (cabeçalho azul/indigo com texto em negrito, painel congelado na linha 1, autofiltro ativado e aba de resumo de métricas).
- **`cli/server.js`**: Servidor Express na porta 4000 (`/api/health`, `/api/extract-urls`, `/api/check-url`). Tratamento obrigatório: escutar evento `error` no servidor e, se `err.code === 'EADDRINUSE'`, logar mensagem informativa e executar `process.exit(0)` para não derrubar o Vite.
- **`cli/check-sitemap.js`**: CLI executável (`node check-sitemap.js <url>`). Se rodar sem argumento, solicita a URL via `readline`. Exibe progresso e gera o arquivo `.xlsx`.

---

## 🌐 Regras de CORS e Cascata de Fallback no Frontend

Como o navegador bloqueia requisições cross-origin sem cabeçalhos CORS, a tela deve implementar uma cascata de fallbacks por URL:

1. **Fetch Direto (`fetch(url)`)**:
   - **Download do Sitemap (XML):** Tenta primeiro o fetch direto.
   - **Checagem por URL:** **DESATIVADO POR PADRÃO** (para evitar poluição no console DevTools com erros de CORS). Pode ser ativado via opção avançada "Tentar fetch direto antes do proxy".
2. **Proxy Primário (`corsproxy.io`)**: `https://corsproxy.io/?<url_encodada>`. Lê os cabeçalhos de status e o header `X-Final-URL` para redirecionamentos.
3. **Proxy Secundário (`allorigins.win`)**:
   - Para baixar XML do sitemap: `https://api.allorigins.win/raw?url=<url>`
   - Para checagem de URL: `https://api.allorigins.win/get?url=<url>` (lê o JSON retornado com `status.http_code`, `status.content_type`, `status.url`).
4. **Sem Dados Inventados**: Se todos falharem, a URL deve ser marcada com `status: 0`, `source: 'unavailable'`, `contentType: 'indisponivel'`, contabilizada como erro.

### Detecção Automática do Servidor Local
Ao carregar a página, a tela faz um `GET http://localhost:4000/api/health` com timeout curto (1500ms). Se responder OK, ativa automaticamente o toggle **"🟢 Servidor local conectado — usar"**, delegando tanto a extração quanto a checagem ao servidor Express local (que não sofre com restrições de CORS e captura o 3xx exato).

---

## 🎨 UI / Design Tokens (CSS Puro)

Página única utilizando variáveis CSS obrigatórias:
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
  --radius-sm: 0.375rem; --radius-md: 0.5rem; --radius-lg: 0.75rem;
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -1px rgba(0,0,0,.06);
  --spacing-xs: .25rem; --spacing-sm: .5rem; --spacing-md: 1rem; --spacing-lg: 1.5rem; --spacing-xl: 2rem;
}
body { font-family: 'Inter', system-ui, sans-serif; background: linear-gradient(135deg, hsl(220,20%,97%) 0%, hsl(250,30%,95%) 100%); }