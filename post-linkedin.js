const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const posts = require('./posts.json');

async function postToLinkedIn() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const orgId = process.env.LINKEDIN_ORGANIZATION_ID;

  if (!token || !orgId) {
    console.error('❌ Variables manquantes : LINKEDIN_ACCESS_TOKEN ou LINKEDIN_ORGANIZATION_ID');
    process.exit(1);
  }

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
      'LinkedIn-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:organization:${orgId}`,
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
    const location = response.headers.get('x-restli-id') || response.headers.get('location');
    console.log('✅ Post publié — id:', location);
  } else {
    const body = await response.text();
    console.error(`❌ Erreur ${response.status} :`, body);
    process.exit(1);
  }
}

postToLinkedIn();
