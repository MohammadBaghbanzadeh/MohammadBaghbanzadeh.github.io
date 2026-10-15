# Mohammad Baghbanzadeh — academic portfolio

Persian / RTL, responsive, buildless portfolio on GitHub Pages.

- Home: <https://mohammadbaghbanzadeh.github.io/>
- Graph mining: [GML/GPP.html](GML/GPP.html)
- Algorithms: [AmortizedAnalysis/PotentialMethod.html](AmortizedAnalysis/PotentialMethod.html)
- Private workspace: [vault.html](vault.html)

## Local preview and checks

Node.js 20+; no npm dependencies or build required.

```sh
node scripts/preview.mjs
npm test
```

The preview server blocks dot-directories and non-public routes. Do **not** serve this checkout with an unrestricted file server: `.private/` contains local-only data.

## Private workspace

Only `data/archive.enc.json` is published. Report HTML, titles, descriptions and the report list are encrypted together with AES-256-GCM. A fresh 128-bit salt, 96-bit nonce, PBKDF2-SHA256 (600,000 iterations) and authenticated format context are used. Browser decryption uses the native Web Crypto API over HTTPS. No password, password hash, decryption key or unencrypted report is stored in Git.

The initial random password and source catalog live in ignored `.private/password.txt` and `.private/catalog.json`. Keep a separate private backup: a fresh clone cannot reconstruct these files without the password/source backup. Share the password through a private channel; the helper never prints it.

The unlocked workspace lives only in browser memory. Reloading, leaving, manual locking or 15 minutes of inactivity clears the page. Reports use an opaque-origin sandboxed iframe with network access blocked; self-contained HTML is recommended. External links and remote fonts inside presentations are intentionally blocked. An authorized reader can still copy what they see. GitHub Pages has no server-side authentication or rate limiting: use a strong password against offline guessing. This is encrypted publishing, not individual user accounts. Changing a password cannot revoke already downloaded copies or old ciphertext protected with a previously shared password.

### Add a report

Run locally where `.private/` exists. Adjust the path, week number and text:

```sh
node scripts/archive.mjs add --week 2 --file /absolute/path/to/report.html --title "هفتهٔ دوم: گزارش پیشرفت" --summary "خلاصهٔ گزارش"
npm test
git add data/archive.enc.json
git commit -m "Update encrypted workspace"
git push origin main
```

The HTML is copied to `.private/reports/`; only the encrypted archive changes publicly. Duplicate weeks are rejected. To revise an existing report, edit its local source under `.private/reports/` and run `node scripts/archive.mjs seal`.

### Change the password

Edit `.private/password.txt` in a private editor (at least 20 random characters), run `node scripts/archive.mjs seal`, and commit/push **only** `data/archive.enc.json`. All current reports use the new password. Historical encrypted archives remain in Git history and remain decryptable with their old password.

### Initial provisioning

`node scripts/archive.mjs init --file /absolute/path/to/report.html` creates a local random password, catalog and encrypted archive. It refuses to overwrite existing credentials. Do not run it on the live archive unless intentionally provisioning a new collection; restore the original private backup instead.

## Deployment

GitHub Pages publishes `main` at the repository root. `.nojekyll` enables direct static publication. No build, third-party runtime, analytics, hosted API or external font service is required. Existing materials and URLs are retained.

Font: Vazirmatn by Saber Rastikerdar, SIL Open Font License; see `assets/fonts/OFL.txt`.
