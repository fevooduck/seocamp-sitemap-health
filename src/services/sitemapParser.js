/**
 * src/services/sitemapParser.js
 *
 * Parser de XML de sitemaps para ambiente de navegador baseado em DOMParser nativo.
 */

/**
 * Faz o parse de texto XML e extrai URLs de sitemapindex ou urlset.
 * @param {string} xmlText
 * @returns {{ isIndex: boolean, urls: string[], childSitemaps: string[] }}
 */
export function parseSitemapXml(xmlText) {
  if (!xmlText || typeof xmlText !== 'string') {
    return { isIndex: false, urls: [], childSitemaps: [] };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    // Tenta fallback com regex caso o DOMParser acuse erro de sintaxe
    return parseViaRegex(xmlText);
  }

  const isIndex = doc.getElementsByTagName('sitemapindex').length > 0;
  const childSitemaps = [];
  const urls = [];

  if (isIndex) {
    const sitemaps = doc.getElementsByTagName('sitemap');
    for (let i = 0; i < sitemaps.length; i++) {
      const loc = sitemaps[i].getElementsByTagName('loc')[0];
      if (loc && loc.textContent) {
        childSitemaps.push(loc.textContent.trim());
      }
    }
  } else {
    const urlElements = doc.getElementsByTagName('url');
    for (let i = 0; i < urlElements.length; i++) {
      const loc = urlElements[i].getElementsByTagName('loc')[0];
      if (loc && loc.textContent) {
        const text = loc.textContent.trim();
        if (text.startsWith('http')) {
          urls.push(text);
        }
      }
    }
  }

  // Se nada foi encontrado pelos nós padrão, faz fallback regex
  if (urls.length === 0 && childSitemaps.length === 0) {
    return parseViaRegex(xmlText);
  }

  return {
    isIndex,
    urls: Array.from(new Set(urls)),
    childSitemaps: Array.from(new Set(childSitemaps))
  };
}

/**
 * Fallback de regex caso o parser XML do navegador rejeite namespaces ou entidades HTML.
 * @param {string} xml
 * @returns {{ isIndex: boolean, urls: string[], childSitemaps: string[] }}
 */
function parseViaRegex(xml) {
  const isIndex = /<sitemapindex/i.test(xml);
  const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/gi;
  const items = [];
  let match;

  while ((match = locRegex.exec(xml)) !== null) {
    items.push(match[1].trim());
  }

  const unique = Array.from(new Set(items));

  if (isIndex) {
    return { isIndex: true, urls: [], childSitemaps: unique };
  }
  return { isIndex: false, urls: unique, childSitemaps: [] };
}
