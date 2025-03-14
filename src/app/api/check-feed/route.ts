import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL é obrigatória' },
        { status: 400 }
      );
    }

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, application/xhtml+xml, text/html;q=0.9, text/plain;q=0.8, */*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      },
      validateStatus: function (status) {
        return status >= 200 && status < 300;
      }
    });

    const content = response.data.toString().toLowerCase();
    
    // Verifica se é uma página de listagem de feeds
    const isFeedListPage = content.includes('rss feeds') ||
                          content.includes('feed reader') ||
                          content.includes('really simple syndication') ||
                          content.includes('rss feed') ||
                          content.includes('rss-2') ||
                          content.includes('rss2');

    // Verifica se o conteúdo é XML ou RSS
    const contentType = response.headers['content-type'] || '';
    const isXML = contentType.includes('xml') || 
                  contentType.includes('rss') || 
                  contentType.includes('atom') ||
                  content.includes('<?xml') ||
                  content.includes('<rss') ||
                  content.includes('<feed') ||
                  content.includes('rss version="2.0"') ||
                  content.includes('rss version="1.0"') ||
                  content.includes('rss version="0.92"');

    // Verifica se há links RSS/Atom no HTML
    const hasRSSLink = content.includes('type="application/rss+xml"') ||
                      content.includes('type="application/atom+xml"') ||
                      content.includes('rel="alternate" type="application/rss+xml"') ||
                      content.includes('rel="alternate" type="application/atom+xml"');

    // Extrai URLs de feeds do HTML
    let feedUrls: string[] = [];
    if (hasRSSLink) {
      const matches = content.match(/<link[^>]*rel="alternate"[^>]*type="application\/(rss|atom)\+xml"[^>]*href="([^"]+)"[^>]*>/g);
      if (matches) {
        feedUrls = matches
          .map((match: string) => {
            const href = match.match(/href="([^"]+)"/);
            return href ? href[1] : null;
          })
          .filter((url: string | null): url is string => url !== null);
      }
    }

    // Considera válido se for XML, uma página de listagem de feeds ou se tiver links RSS
    const hasFeed = isXML || isFeedListPage || hasRSSLink;

    return NextResponse.json({
      hasFeed,
      status: response.status,
      contentType: contentType,
      isFeedListPage,
      isXML,
      hasRSSLink,
      feedUrls,
      url: url
    });
  } catch (error) {
    console.error('Erro ao verificar feed:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar feed' },
      { status: 500 }
    );
  }
} 