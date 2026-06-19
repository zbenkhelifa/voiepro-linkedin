const fs = require('fs');
const themes = require('../content/themes.json');

const PROMPT_SYSTEM = `Tu es le community manager de VoiePro, une application numérique qui digitalise la gestion des stages et de l'alternance pour les lycées professionnels, CFA, entreprises et élèves en France.

Ton rôle : écrire des posts LinkedIn qui informent, inspirent et génèrent de l'engagement autour de la voie professionnelle.`;

const PROMPT_USER = (theme, news) => {
  const newsSection = news
    ? `\nActualités récentes du secteur (inspire-toi en si une est pertinente, sans les citer mot pour mot) :\n${news}\n`
    : '';

  return `Écris un post LinkedIn sur ce thème : "${theme}"
${newsSection}
Format :
- Accroche forte en 1 ligne (commence par un émoji)
- 2 à 3 paragraphes courts et concrets (1-2 phrases chacun)
- 1 call-to-action naturel en fin de post
- 4 à 5 hashtags FR pertinents (#VoiePro #Stage #Alternance #LycéePro #BacPro #EdTech...)

Contraintes :
- Ton professionnel mais accessible, direct, sans jargon inutile
- Pas de tirets "-" ni de bullet points, utilise des sauts de ligne
- Pas de titres ou sous-titres en gras
- Maximum 1200 caractères espaces compris
- En français uniquement`;
};

async function generatePost() {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    console.error('❌ MISTRAL_API_KEY manquant');
    process.exit(1);
  }

  const customTheme = (process.env.CUSTOM_THEME || '').trim();
  let theme;
  let pillarKey = 'secteur';

  if (customTheme) {
    theme = customTheme;
    console.log('🎯 Thème personnalisé :', theme);
  } else {
    const day = new Date().getDay(); // 0=Dim ... 6=Sam
    pillarKey = themes.planning[day] || 'secteur';
    const pillar = themes.pilliers[pillarKey];
    const weekIndex = Math.floor(Date.now() / (7 * 86400000));
    theme = pillar[weekIndex % pillar.length];
    console.log(`🗓️  Jour ${day} → pilier "${pillarKey}" → thème : ${theme}`);
  }

  const news = (process.env.NEWS_CONTEXT || '').trim();
  if (news) {
    console.log(`\n📰 Contexte actualité injecté (${news.split('\n').length} articles)`);
  }

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: PROMPT_SYSTEM },
        { role: 'user', content: PROMPT_USER(theme, news) },
      ],
      max_tokens: 600,
      temperature: 0.85,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`❌ Erreur Mistral ${response.status} :`, err);
    process.exit(1);
  }

  const data = await response.json();
  const text = data.choices[0].message.content.trim();

  console.log('\n📝 Post généré :\n' + text);
  console.log(`\n📊 Longueur : ${text.length} caractères`);

  // Écriture dans GITHUB_ENV (les deux variables d'un coup)
  const envFile = process.env.GITHUB_ENV;
  if (envFile) {
    fs.appendFileSync(envFile, `PILLAR_KEY=${pillarKey}\n`);
    fs.appendFileSync(envFile, `POST_TEXT<<__VOIEPRO_EOF__\n${text}\n__VOIEPRO_EOF__\n`);
  } else {
    // Fallback local
    fs.writeFileSync('/tmp/post.txt', text, 'utf8');
    console.log(`\n🔑 PILLAR_KEY=${pillarKey}`);
  }
}

generatePost();
