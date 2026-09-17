/**
 * cli/server.js
 *
 * Ponto de entrada do servidor Express local:
 * - Inicia o servidor na porta 4000 (ou PORT especificada).
 * - Tratamento obrigatório: escuta evento 'error' e, se err.code === 'EADDRINUSE',
 *   loga aviso informativo e encerra com process.exit(0) para não derrubar o Vite.
 */

import { app } from './app.js';

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`[backend] Servidor Express ativo em http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[backend] Porta ${PORT} já está em uso por outro processo.`);
    console.warn(`[backend] Instância ativa detectada. Encerrando processo duplicado de forma graciosa sem interromper o Vite.`);
    process.exit(0);
  } else {
    console.error('[backend] Erro fatal no servidor Express:', err);
    process.exit(1);
  }
});

export { server };
