/**
 * src/App.jsx
 *
 * Componente raiz do Sitemap Health Checker:
 * - Autodetecção do servidor Express local (:4000)
 * - Coordenação de extração recursiva de sitemaps e checagens concorrentes
 * - Suporte a cascata de CORS no navegador com zero dados inventados
 * - Métricas em tempo real, ordenação por severidade e exportação
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header.jsx';
import { SitemapInput } from './components/SitemapInput.jsx';
import { AdvancedOptions } from './components/AdvancedOptions.jsx';
import { ProgressBar } from './components/ProgressBar.jsx';
import { MetricCards } from './components/MetricCards.jsx';
import { FilterTabs } from './components/FilterTabs.jsx';
import { ResultsTable } from './components/ResultsTable.jsx';
import { ExportActions } from './components/ExportActions.jsx';

import { checkServerHealth, extractUrlsViaBackend, checkUrlViaBackend } from './services/backendApi.js';
import { extractUrlsInBrowser, checkUrlInBrowser } from './services/proxyFallback.js';
import { runClientConcurrentTasks } from './services/concurrencyRunner.js';
import { sortResultsBySeverity } from './utils/exportHelpers.js';

export default function App() {
  // Configurações de estado
  const [url, setUrl] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [phaseMessage, setPhaseMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Status de conectividade do backend
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [isCheckingServer, setIsCheckingServer] = useState(true);
  const [useLocalServer, setUseLocalServer] = useState(false);

  // Opções avançadas
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [concurrency, setConcurrency] = useState(5);
  const [timeoutMs, setTimeoutMs] = useState(10000);
  const [allowDirectFetch, setAllowDirectFetch] = useState(false);

  // Progresso e resultados
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0, currentUrl: '' });
  const [results, setResults] = useState([]);

  // Filtros de exibição
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const abortControllerRef = useRef(null);

  // 1. Detecção automática do servidor Express local ao iniciar
  const verifyServerHealth = async () => {
    setIsCheckingServer(true);
    const online = await checkServerHealth();
    setIsServerOnline(online);
    setIsCheckingServer(false);

    if (online) {
      // Ativa automaticamente o toggle conforme regra obrigatória
      setUseLocalServer(true);
    } else {
      setUseLocalServer(false);
    }
  };

  useEffect(() => {
    verifyServerHealth();
  }, []);

  // 2. Início da auditoria
  const handleStartAudit = async () => {
    if (!url.trim()) return;

    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
      setUrl(targetUrl);
    }

    setErrorMessage('');
    setResults([]);
    setProgress({ current: 0, total: 0, percentage: 0, currentUrl: '' });
    setIsRunning(true);
    setPhaseMessage('Baixando e extraindo URLs do sitemap...');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let extractedUrls = [];

    try {
      if (useLocalServer && isServerOnline) {
        extractedUrls = await extractUrlsViaBackend(targetUrl, controller.signal);
      } else {
        extractedUrls = await extractUrlsInBrowser(targetUrl, {
          signal: controller.signal,
          timeout: timeoutMs
        });
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setPhaseMessage('Auditoria cancelada.');
        setIsRunning(false);
        return;
      }
      setErrorMessage(`Falha na extração do sitemap: ${err.message}`);
      setIsRunning(false);
      setPhaseMessage('');
      return;
    }

    if (!extractedUrls || extractedUrls.length === 0) {
      setErrorMessage('Nenhuma URL válida encontrada na estrutura do sitemap informado.');
      setIsRunning(false);
      setPhaseMessage('');
      return;
    }

    setProgress({ current: 0, total: extractedUrls.length, percentage: 0, currentUrl: '' });
    setPhaseMessage(`Analisando ${extractedUrls.length} URLs com ${concurrency} conexões simultâneas...`);

    const accumulatedResults = [];

    try {
      await runClientConcurrentTasks(
        extractedUrls,
        async (itemUrl) => {
          if (useLocalServer && isServerOnline) {
            return await checkUrlViaBackend(itemUrl, {
              timeout: timeoutMs,
              signal: controller.signal
            });
          } else {
            return await checkUrlInBrowser(itemUrl, {
              allowDirectFetch,
              timeout: timeoutMs,
              signal: controller.signal
            });
          }
        },
        {
          concurrency,
          minJitter: 20,
          maxJitter: 80,
          signal: controller.signal,
          onProgress: ({ current, total, percentage, result, item }) => {
            accumulatedResults.push(result);
            setProgress({
              current,
              total,
              percentage,
              currentUrl: item
            });
            // Atualiza a tabela dinamicamente em lotes ou a cada URL
            setResults([...accumulatedResults]);
          }
        }
      );

      if (!controller.signal.aborted) {
        setPhaseMessage('Auditoria concluída com sucesso!');
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setPhaseMessage('Auditoria interrompida pelo usuário.');
      } else {
        setErrorMessage(`Ocorreu um erro durante a checagem: ${err.message}`);
      }
    } finally {
      setIsRunning(false);
    }
  };

  // 3. Cancelamento da auditoria
  const handleCancelAudit = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRunning(false);
    setPhaseMessage('Auditoria interrompida pelo usuário.');
  };

  // 4. Métricas consolidadas
  const metrics = useMemo(() => {
    const total = results.length;
    const count2xx = results.filter((r) => r.status >= 200 && r.status < 300).length;
    const count3xx = results.filter((r) => r.status >= 300 && r.status < 400).length;
    const count4xx = results.filter((r) => r.status >= 400 && r.status < 500).length;
    const count5xx = results.filter((r) => r.status >= 500 && r.status < 600).length;
    const count0 = results.filter((r) => !r.status || r.status === 0).length;
    const totalTime = results.reduce((acc, r) => acc + (r.responseTime || 0), 0);
    const avgLatency = total > 0 ? Math.round(totalTime / total) : 0;

    return { total, count2xx, count3xx, count4xx, count5xx, count0, avgLatency };
  }, [results]);

  // 5. Lista ordenada por severidade (erros 4xx/5xx/0 -> 3xx -> 2xx) e filtrada
  const displayedResults = useMemo(() => {
    let sorted = sortResultsBySeverity(results);

    // Filtro por tab
    if (activeFilter === '2xx') {
      sorted = sorted.filter((r) => r.status >= 200 && r.status < 300);
    } else if (activeFilter === '3xx') {
      sorted = sorted.filter((r) => r.status >= 300 && r.status < 400);
    } else if (activeFilter === '4xx') {
      sorted = sorted.filter((r) => r.status >= 400 && r.status < 500);
    } else if (activeFilter === '5xx') {
      sorted = sorted.filter((r) => r.status >= 500 && r.status < 600);
    } else if (activeFilter === '0') {
      sorted = sorted.filter((r) => !r.status || r.status === 0);
    }

    // Filtro textual
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      sorted = sorted.filter(
        (r) =>
          (r.url && r.url.toLowerCase().includes(q)) ||
          (r.location && r.location.toLowerCase().includes(q)) ||
          (r.statusText && r.statusText.toLowerCase().includes(q))
      );
    }

    return sorted;
  }, [results, activeFilter, searchQuery]);

  return (
    <div className="app-container">
      <Header
        isServerOnline={isServerOnline}
        isCheckingServer={isCheckingServer}
        onRefreshHealth={verifyServerHealth}
      />

      <SitemapInput
        url={url}
        setUrl={setUrl}
        isRunning={isRunning}
        onStart={handleStartAudit}
        onCancel={handleCancelAudit}
        useLocalServer={useLocalServer}
        setUseLocalServer={setUseLocalServer}
        isServerOnline={isServerOnline}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
      />

      <AdvancedOptions
        isOpen={showAdvanced}
        concurrency={concurrency}
        setConcurrency={setConcurrency}
        timeout={timeoutMs}
        setTimeoutMs={setTimeoutMs}
        allowDirectFetch={allowDirectFetch}
        setAllowDirectFetch={setAllowDirectFetch}
        useLocalServer={useLocalServer}
      />

      {errorMessage && (
        <div className="alert alert-error">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      <ProgressBar
        isRunning={isRunning}
        current={progress.current}
        total={progress.total}
        percentage={progress.percentage}
        currentUrl={progress.currentUrl}
        phaseMessage={phaseMessage}
      />

      {results.length > 0 && (
        <>
          <MetricCards metrics={metrics} />

          <ExportActions
            results={results}
            sitemapUrl={url}
            isServerOnline={isServerOnline}
          />

          <FilterTabs
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            counts={metrics}
          />

          <ResultsTable
            results={displayedResults}
            isRunning={isRunning}
          />
        </>
      )}
    </div>
  );
}
