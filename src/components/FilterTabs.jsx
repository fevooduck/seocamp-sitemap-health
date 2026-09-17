/**
 * src/components/FilterTabs.jsx
 *
 * Filtros rápidos por faixa de status HTTP e busca textual por URL.
 */

import React from 'react';

export function FilterTabs({
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  counts
}) {
  const tabs = [
    { id: 'all', label: 'Todos', count: counts.total },
    { id: '2xx', label: '2xx Sucesso', count: counts.count2xx },
    { id: '3xx', label: '3xx Redirecionamento', count: counts.count3xx },
    { id: '4xx', label: '4xx Erro Cliente', count: counts.count4xx },
    { id: '5xx', label: '5xx Erro Servidor', count: counts.count5xx },
    { id: '0', label: '0 Indisponível', count: counts.count0 }
  ];

  return (
    <div className="filter-bar">
      <div className="filter-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`filter-tab ${activeFilter === tab.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(tab.id)}
          >
            <span>{tab.label}</span>
            <span className="badge">{tab.count}</span>
          </button>
        ))}
      </div>

      <input
        type="search"
        className="search-input"
        placeholder="Filtrar por URL ou destino..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
}
