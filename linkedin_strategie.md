# Stratégie : Automatiser les impressions LinkedIn via GitHub Actions

## Objectif
Poster automatiquement sur LinkedIn à partir de GitHub Actions, avec génération de contenu par Mistral AI, pour maximiser la visibilité de tes projets EdTech de façon cohérente et sans effort manuel.

---

## Structure du repo

```
.github/
  workflows/
    linkedin_post.yml       # Workflow principal
scripts/
  generate_post.py          # Appel Mistral AI → /tmp/post.txt
  generate_post_from_push.py  # Variante contextuelle (commit)
  validate_post.py          # Contrôle longueur, hashtags, ton
  post_linkedin.py          # Appel API LinkedIn REST
content/
  themes.json               # Banque de sujets rotatifs
  history.json              # Log des posts publiés
  last_post_date.txt        # Anti-spam (min 24h entre posts)
```

---

## Déclencheurs (3 modes)

| Mode | Config YAML | Usage |
|------|-------------|-------|
| **Cron automatique** | `cron: '0 7 * * 1,3,5'` | Lun/Mer/Ven à 7h UTC — thème du jour depuis `themes.json` |
| **Push sur main** | `paths: ['projects/**', 'CHANGELOG.md']` | Annonce automatique d'une nouvelle feature ou release |
| **Manuel** | `workflow_dispatch` avec input `theme` | Post sur demande, thème libre |

---

## Pipeline d'exécution (5 étapes)

```
Déclencheur
    ↓
[1] generate_post.py       → Mistral génère le texte → /tmp/post.txt
    ↓
[2] Sélection image        → Assets dans le repo ou générée (optionnel)
    ↓
[3] validate_post.py       → Longueur ≤ 1300 chars, hashtags présents
    ↓ (si échec → abort + notification)
[4] post_linkedin.py       → POST /v2/ugcPosts avec Bearer token
    ↓
[5] Log analytics          → history.json commité dans le repo
```

---

## Secrets GitHub à configurer

`Settings → Secrets and variables → Actions` :

| Secret | Valeur |
|--------|--------|
| `MISTRAL_API_KEY` | Clé API Mistral |
| `LINKEDIN_TOKEN` | OAuth 2.0, scope `w_member_social` |
| `LINKEDIN_PERSON_URN` | `urn:li:person:XXXXXXXX` (via `GET /v2/me`) |

> Pour le token LinkedIn : créer une **LinkedIn Developer App** avec le produit **"Share on LinkedIn"** activé.

---

## Génération du post (Mistral)

```python
# Mode cron : thème du jour
theme = themes[date.today().weekday() % len(themes)]

# Mode push : contexte du commit
commit_msg = os.getenv("COMMIT_MESSAGE")
# → skip si "fix typo", "wip", "merge", "chore:", "docs: minor"
```

**Prompt Mistral :**
- Accroche percutante (1 ligne)
- 3-4 points clés avec émojis
- Call-to-action
- 5 hashtags FR/EdTech
- Max 1300 caractères

---

## Banque de thèmes (`themes.json`)

```json
[
  "Un outil que j'ai créé pour mes élèves cette semaine",
  "Retour d'expérience : enseigner la programmation en lycée",
  "Projet EdTech indie : ce que j'ai appris ce mois-ci",
  "SNT / STI2D : une activité pédagogique qui a cartonné",
  "Flutter + Supabase : une astuce technique en 5 minutes",
  "Être prof ET développeur : concilier les deux"
]
```

---

## Post vers LinkedIn API

```python
requests.post(
    "https://api.linkedin.com/v2/ugcPosts",
    headers={"Authorization": f"Bearer {token}", ...},
    json={
        "author": urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": post_text},
                "shareMediaCategory": "NONE"
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
    }
)
```

---

## Déclencheur depuis un push

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'projects/**'
      - 'README.md'
      - 'CHANGELOG.md'
```

Filtre anti-spam dans le script :
```python
skip_keywords = ["fix typo", "wip", "merge", "chore:", "docs: minor"]
if any(kw in commit_msg.lower() for kw in skip_keywords):
    exit(0)  # Pas de post
```

Et dans le job :
```yaml
- name: Post to LinkedIn
  run: |
    if [ -f /tmp/skip ]; then
      echo "Post ignoré"
    else
      python scripts/post_linkedin.py
    fi
```

---

## Règle clé pour les impressions

> **3 posts/semaine sur des sujets cohérents** (EdTech, enseignement, Flutter) > 1 post/jour sur des sujets disparates.

L'algorithme LinkedIn récompense la **cohérence thématique** — elle signale que tu es un créateur de niche, ce qui multiplie la distribution organique.
