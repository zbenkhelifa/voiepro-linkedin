const http = require('http');
const { exec } = require('child_process');

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';
const SCOPE = 'openid profile w_member_social';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Lance avec : LINKEDIN_CLIENT_ID=xxx LINKEDIN_CLIENT_SECRET=xxx node get-token.js');
  process.exit(1);
}

const authUrl =
  `https://www.linkedin.com/oauth/v2/authorization` +
  `?response_type=code` +
  `&client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&scope=${encodeURIComponent(SCOPE)}`;

console.log('\n🔗 Ouvre ce lien dans ton navigateur :\n');
console.log(authUrl);
console.log('\n⏳ En attente de la redirection...\n');

exec(`xdg-open "${authUrl}" 2>/dev/null || true`);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3000');
  const code = url.searchParams.get('code');

  if (!code) {
    const error = url.searchParams.get('error');
    const errorDesc = url.searchParams.get('error_description');
    res.end(`Pas de code reçu. Erreur: ${error} — ${errorDesc}`);
    console.error('❌ Erreur LinkedIn:', error, errorDesc);
    return;
  }

  res.end('<h2>✅ Autorisation reçue ! Retourne dans le terminal.</h2>');
  server.close();

  const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

  // Échange du code contre un access token
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    console.error('❌ Erreur token :', tokenData);
    process.exit(1);
  }

  // Récupération du person URN
  const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const profile = await profileRes.json();
  const personId = profile.sub;

  console.log('✅ Succès !\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`LINKEDIN_ACCESS_TOKEN=${tokenData.access_token}`);
  console.log(`LINKEDIN_PERSON_ID=${personId}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n⏱️  Token valide ~60 jours (expire dans ${Math.round(tokenData.expires_in / 86400)} jours)`);
  console.log('\n👉 Ajoute ces 2 valeurs comme secrets GitHub dans ton repo voiepro-linkedin');
});

server.listen(3000);
