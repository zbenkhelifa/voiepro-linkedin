const fs = require('fs');
const path = require('path');

async function uploadImage(token, author) {
  const pillar = (process.env.PILLAR_KEY || 'secteur').toLowerCase();
  const imagesDir = path.join(__dirname, 'content', 'images');

  if (!fs.existsSync(imagesDir)) return null;

  const files = fs.readdirSync(imagesDir).filter(f =>
    f.startsWith(pillar) && (f.endsWith('.jpg') || f.endsWith('.png'))
  );

  if (files.length === 0) {
    console.log(`ℹ️  Aucune image trouvée pour le pilier "${pillar}" — post sans image`);
    return null;
  }

  const file = files[Math.floor(Math.random() * files.length)];
  const filePath = path.join(imagesDir, file);
  const mimeType = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
  console.log(`🖼️  Image sélectionnée : ${file}`);

  // Étape 1 : enregistrer l'upload
  const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: author,
        serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
      },
    }),
  });

  if (!registerRes.ok) {
    console.warn('⚠️  Enregistrement upload échoué :', await registerRes.text());
    return null;
  }

  const registerData = await registerRes.json();
  const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
  const assetUrn = registerData.value.asset;

  // Étape 2 : uploader le binaire
  const imageBuffer = fs.readFileSync(filePath);
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: imageBuffer,
  });

  if (!uploadRes.ok) {
    console.warn('⚠️  Upload image échoué :', uploadRes.status);
    return null;
  }

  console.log('✅ Image uploadée — asset:', assetUrn);
  return assetUrn;
}

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

  const text = process.env.POST_TEXT
    || (fs.existsSync('/tmp/post.txt') ? fs.readFileSync('/tmp/post.txt', 'utf8').trim() : '');

  if (!text) {
    console.error('❌ POST_TEXT vide — aucun contenu à publier');
    process.exit(1);
  }

  const author = personUrn.startsWith('urn:li:') ? personUrn : `urn:li:person:${personUrn}`;
  console.log('👤 Auteur :', author);

  const assetUrn = await uploadImage(token, author);

  const shareContent = assetUrn
    ? {
        shareCommentary: { text },
        shareMediaCategory: 'IMAGE',
        media: [{ status: 'READY', media: assetUrn }],
      }
    : {
        shareCommentary: { text },
        shareMediaCategory: 'NONE',
      };

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
      specificContent: { 'com.linkedin.ugc.ShareContent': shareContent },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });

  if (response.status !== 201) {
    const body = await response.text();
    console.error(`❌ Erreur ${response.status} :`, body);
    process.exit(1);
  }

  const postUrn = response.headers.get('x-restli-id') || response.headers.get('location');
  console.log('✅ Post publié — id:', postUrn);

  // Commentaire avec le lien
  console.log('💬 Ajout du commentaire voiepro.fr…');
  const commentResponse = await fetch(
    `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        actor: author,
        message: { text: '👉 voiepro.fr' },
      }),
    }
  );

  if (commentResponse.status === 201) {
    console.log('✅ Commentaire ajouté');
  } else {
    const err = await commentResponse.text();
    console.warn('⚠️  Commentaire non ajouté :', err);
  }
}

postToLinkedIn();
