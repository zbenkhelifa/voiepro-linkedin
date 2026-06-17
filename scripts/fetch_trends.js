const fs = require('fs');

const QUERIES = [
  'alternance apprentissage France',
  'lycée professionnel stage PFMP',
  'voie professionnelle formation',
];

async function fetchNews(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=fr&gl=FR&ceid=FR:fr`;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VoieProBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const xml = await response.text();
    return [...xml.matchAll(/<item>[\s\S]*?<title>([\s\S]*?)<\/title>/g)]
      .map(m => m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').trim())
      .filter(t => t.length > 20 && !t.toLowerCase().includes('google news'))
      .slice(0, 4);
  } catch {
    return [];
  }
}

async function fetchTrends() {
  console.log('🔍 Récupération des tendances Google News...');

  const seen = new Set();
  const titles = [];

  for (const query of QUERIES) {
    const results = await fetchNews(query);
    console.log(`  "${query}" → ${results.length} article(s)`);
    for (const t of results) {
      if (!seen.has(t)) {
        seen.add(t);
        titles.push(t);
      }
    }
  }

  const top = titles.slice(0, 8);

  if (top.length === 0) {
    console.log('⚠️  Aucune actualité récupérée — Mistral utilisera le thème seul');
    return;
  }

  console.log('\n📰 Actualités du secteur :');
  top.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

  const envFile = process.env.GITHUB_ENV;
  if (envFile) {
    fs.appendFileSync(envFile, `NEWS_CONTEXT<<__NEWS_EOF__\n${top.join('\n')}\n__NEWS_EOF__\n`);
  }
}

fetchTrends();
