const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const posts = require('./posts.json');

async function getPersonId(token) {
  const res = await fetch('https://api.linkedin.com/v2/me', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Impossible de récupérer le profil : ${res.status}`);
  const data = await res.json();
  return data.id;
}

async function postToLinkedIn() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;

  if (!token) {
    console.error('❌ Variable manquante : LINKEDIN_ACCESS_TOKEN');
    process.exit(1);
  }

  const personId = await getPersonId(token);
  console.log('👤 Profil LinkedIn :', personId);

  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  const index = dayOfYear % posts.length;
  const text = posts[index];

  console.log(`Jour ${dayOfYear} → post #${index}`);
  console.log('Contenu :', text);

  const author = personId.startsWith('urn:li:') ? personId : `urn:li:person:${personId}`;

  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  });

  if (response.status === 201) {
    const id = response.headers.get('x-restli-id') || response.headers.get('location');
    console.log('✅ Post publié — id:', id);
  } else {
    const body = await response.text();
    console.error(`❌ Erreur ${response.status} :`, body);
    process.exit(1);
  }
}

postToLinkedIn();
