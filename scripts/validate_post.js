const fs = require('fs');

const text = process.env.POST_TEXT
  || (fs.existsSync('/tmp/post.txt') ? fs.readFileSync('/tmp/post.txt', 'utf8').trim() : '');

if (!text) {
  console.error('❌ POST_TEXT vide — la génération a peut-être échoué');
  process.exit(1);
}

const errors = [];

if (text.length > 1300) {
  errors.push(`Post trop long : ${text.length}/1300 caractères`);
}

if (text.length < 80) {
  errors.push(`Post trop court : ${text.length} caractères`);
}

if (!text.includes('#')) {
  errors.push('Aucun hashtag trouvé');
}

if (errors.length > 0) {
  errors.forEach(e => console.error('❌', e));
  process.exit(1);
}

console.log(`✅ Post valide — ${text.length} caractères`);
