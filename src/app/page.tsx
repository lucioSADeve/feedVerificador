'use client';

import { useState } from 'react';
import axios from 'axios';

export default function Home() {
  const [domains, setDomains] = useState('');
  const [results, setResults] = useState<Array<{
    domain: string;
    hasFeed: boolean;
    feedUrl?: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'detailed' | 'simple'>('detailed');

  const clearResults = () => {
    setResults([]);
  };

  const checkFeed = async (url: string) => {
    try {
      const response = await axios.post('/api/check-feed', { url });
      return {
        hasFeed: response.data.hasFeed,
        isFeedListPage: response.data.isFeedListPage,
        isXML: response.data.isXML
      };
    } catch (error) {
      return {
        hasFeed: false,
        isFeedListPage: false,
        isXML: false
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearResults(); // Limpa resultados anteriores

    try {
      const domainList = domains
        .split(/[,\n]/)
        .map(d => d.trim())
        .filter(d => d.length > 0);

      const cleanDomains = domainList.map(domain => domain.replace(/^https?:\/\//, ''));
      
      const feedPaths = [
        '/rss',
        '/feed',
        '/feed/',
        '/feed/rss',
        '/feed.xml',
        '/rss.xml',
        '/atom.xml',
        '/feed/atom',
        '/feed/rss',
        '/paginas/rss-2',
        '/rss-2',
        '/rss2',
        '/feed/rss2',
        '/feed/rss-2',
        '/rss/feed',
        '/feed/rss/feed',
        '/rss/feed.xml',
        '/feed/rss.xml',
        '/index.xml',
        '@/feed/',
        '@/rss/',
        '@/rss.xml',
        '@/feed.xml',
        '@/atom.xml',
        '@/index.xml'
      ];

      const allResults = await Promise.all(
        cleanDomains.map(async (domain) => {
          // Primeiro tenta com os caminhos padrão
          const standardResults = await Promise.all(
            feedPaths.map(async (path) => {
              const feedUrl = `https://${domain}${path}`;
              const result = await checkFeed(feedUrl);
              return {
                domain,
                ...result,
                feedUrl: result.hasFeed ? feedUrl : undefined
              };
            })
          );

          // Se não encontrou, tenta com subdomínios comuns
          if (!standardResults.some(r => r.hasFeed)) {
            const subdomainResults = await Promise.all([
              checkFeed(`https://rss.${domain}`),
              checkFeed(`https://feeds.${domain}`),
              checkFeed(`https://feed.${domain}`),
              checkFeed(`https://www.${domain}/rss`), // Caso específico do NYTimes
            ]);

            const subdomainFeeds = subdomainResults.map((result, index) => ({
              domain,
              ...result,
              feedUrl: result.hasFeed ? 
                index === 3 ? `https://www.${domain}/rss` :
                index === 0 ? `https://rss.${domain}` :
                index === 1 ? `https://feeds.${domain}` :
                `https://feed.${domain}` 
                : undefined
            }));

            return subdomainFeeds.find(r => r.hasFeed) || standardResults.find(r => r.hasFeed);
          }

          return standardResults.find(r => r.hasFeed);
        })
      );

      const validResults = allResults.filter(result => result !== undefined);
      setResults(validResults);
    } catch (error) {
      console.error('Erro ao verificar feeds:', error);
    } finally {
      setLoading(false);
      setDomains('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verificador de Feeds RSS</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Digite um ou mais domínios para encontrar feeds RSS/Atom disponíveis.
          </p>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Como funciona:</p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc pl-5 space-y-1">
              <li>Verifica mais de 20 caminhos comuns de feeds (ex: /rss, /feed, /feed.xml)</li>
              <li>Busca tags &lt;link&gt; com referência a RSS/Atom no código HTML</li>
              <li>Testa subdomínios populares (rss.*, feeds.*, feed.*)</li>
              <li>Analisa o conteúdo para identificar feeds XML e páginas de listagem</li>
            </ul>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex flex-col gap-4">
            <textarea
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
              placeholder="Digite os domínios (um por linha ou separados por vírgula)&#10;Exemplo:&#10;nytimes.com&#10;jovemnerd.com.br"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[120px]"
            />
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Verificando...' : 'Verificar'}
                </button>
                {results.length > 0 && (
                  <button
                    type="button"
                    onClick={clearResults}
                    className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setViewMode('detailed')}
                  className={`px-4 py-2 rounded-lg ${
                    viewMode === 'detailed' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  Detalhado
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('simple')}
                  className={`px-4 py-2 rounded-lg ${
                    viewMode === 'simple' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  Simples
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className="space-y-4">
          {results.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Nenhum feed RSS encontrado nos domínios verificados.
              </p>
            </div>
          ) : viewMode === 'simple' ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <pre className="whitespace-pre-wrap break-all">
                {results
                  .filter(result => result.feedUrl)
                  .map(result => result.feedUrl)
                  .join('\n')}
              </pre>
            </div>
          ) : (
            results.map((result, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {result.domain}
                  </h2>
                  <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Feed Encontrado
                  </span>
                </div>
                
                {result.feedUrl && (
                  <div className="mt-2">
                    <a
                      href={result.feedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 block"
                    >
                      {result.feedUrl}
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
