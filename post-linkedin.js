const fs = require('fs');

async function postToLinkedIn() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  if (!token) {
    console.error('❌ Variable manquante : LINKEDIN_ACCESS_TOKEN');
    process.exit(1);
  }
  if (!personUrn) {
    console.error('❌ Variable manquante : LINKEDIN_PERSON_URN');
    process.exit(1);
  }

  // Texte généré par Mistral (via GITHUB_ENV) ou fallback fichier tmp
  const text = process.env.POST_TEXT
    || (fs.existsSync('/tmp/post.txt') ? fs.readFileSync('/tmp/post.txt', 'utf8').trim() : '');

  if (!text) {
    console.error('❌ POST_TEXT vide — aucun contenu à publier');
    process.exit(1);
  }

  const author = personUrn.startsWith('urn:li:') ? personUrn : `urn:li:person:${personUrn}`;
  console.log('👤 Auteur :', author);
  console.log('📤 Envoi du post…');

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
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
