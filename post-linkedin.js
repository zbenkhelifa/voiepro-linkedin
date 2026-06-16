const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const posts = require('./posts.json');

async function postToLinkedIn() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  if (!token) {
    console.error('❌ Variable manquante : LINKEDIN_ACCESS_TOKEN');
    process.exit(1);
  }
  if (!personUrn) {
    console.error('❌ Variable manquante : LINKEDIN_PERSON_URN (ex: urn:li:person:XXXXXXXXX)');
    process.exit(1);
  }

  const author = personUrn.startsWith('urn:li:') ? personUrn : `urn:li:person:${personUrn}`;
  console.log('👤 Auteur :', author);

  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  const index = dayOfYear % posts.length;
  const text = posts[index];

  console.log(`Jour ${dayOfYear} → post #${index}`);
  console.log('Contenu :', text);

  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202501',
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
