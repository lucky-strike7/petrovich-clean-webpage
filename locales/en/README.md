# English edition

The English site targets exhibition stand builders, producers and museum teams, primarily in the CIS, China and the Middle East. It uses the Russian site's layout, routes, media and application code. No subtitles or new voiceovers are added. Film audio and text inside original media remain in their original language.

Public contacts: Arseny, `ars@petrovichbrothers.com`, `https://t.me/ArsenyPetrovich`, `https://wa.me/79268521102`. The English edition preserves the Russian callback form and accepts international phone numbers. Vercel forwards submissions to the separate English backend on FirstVDS; SMTP stays there, and a private authenticated Vercel function delivers Telegram notifications. Secrets are server-side environment variables. Prices are indicative USD budgets, rounded up to the next USD 1,000 using the Bank of Russia rate for 24 November 2026 (RUB 82.1488 per USD). RUB 500,000 / 700,000 / 900,000 become USD 7,000 / 9,000 / 11,000. The reference rate and fixed display amounts are recorded in `pricing.json`; prices do not fluctuate daily. Historical amounts in case-study stories retain their original currency. International contract terms are agreed separately.

## Editing and synchronisation

`messages.json` maps normalised Russian source strings to reviewed English copy, including metadata, accessible labels and JSON-LD. The page generators remain the source of structure; there is no independent English HTML fork. Normalisation ignores typography-only whitespace changes.

After regenerating Russian pages with `python3 tools/build_pages.py`, run:

```sh
npm run i18n:status
```

`pending.json` lists added or changed source strings and affected pages. Review them, add approved translations to `messages.json` and run:

```sh
npm run i18n:check
npm test
npm run build:en
npm run verify:build
npm run verify:en
NODE_ENV=production SITE_LOCALE=en PORT=5196 npm start
```

The compiler preserves HTML structure and translates text, selected attributes and JSON-LD values. It fails before emitting any English pages if a source string is missing. Approved translations are never overwritten automatically. Removed strings are reported as unused and may be cleaned up after review.

`dist/en/` contains translated documents, sitemap, robots and manifest only. Assets are shared with `dist/`. The English runtime uses the original public URLs and internally selects English documents; `/en/` is not a public route. Do not serve `dist/en` alone as a static site: its relative asset links depend on the shared asset directories.

The separate **Check English translation** workflow runs for main updates and pull requests. Its failure flags translation work without preventing the independent Russian deployment. An English release should only advance after this check succeeds; until then the previously deployed English image remains live. This branch provides detection and strict build validation, not automatic machine translation or an installed scheduled publishing service.

## Vercel publication

The `.com` project is `strangesounds-projects/petrovichbrothers-com` (`prj_4IJ6VwlXU7zx7olkXIdeW6fcfVDg`). `vercel.json` defines a static build (`npm run build:vercel`, output `dist-com/`), English-only documents, shared media, security headers and the legacy redirect map. Both trailing-slash and old project URLs must be checked against the deployed Vercel routes. `.ru` keeps its existing Docker workflow.

Published on `https://petrovichbrothers.com/` on 24 November 2026 from commit `35bddfa3767cbe0626a1d32ba7263cf51cd2f05f`, production deployment `dpl_AzwLb6uA4tyypbP4GGxgSXVzDxd2`. Public checks passed for English home, budgets, stand builders, museums, a detailed case, sitemap, 404, old-case redirects with query parameters, www redirect and MP4 Range 206. The Russian site remained available.

The current English branch is `codex/english-com`. Vercel can build an exact Git SHA from this public repository through its deployment API. Native GitHub auto-deployment additionally requires the repository owner to grant the Vercel GitHub App access to `lucky-strike7/petrovich-clean-webpage`. The attempted native connection was refused for missing repository access; the old repository connection was removed to prevent a later old-site push from overwriting the English release. No Vercel access token is stored in this repository. After access is granted, connect this repository in Vercel Git settings and set Production Branch to `codex/english-com`. Only this branch is enabled in the tracked Vercel deployment configuration.

For a manual release, create a Vercel deployment using this project, `gitSource` with `type: github`, `org: lucky-strike7`, `repo: petrovich-clean-webpage`, `ref: codex/english-com` and the full reviewed `sha`; use `projectSettings` matching `vercel.json` and Node 24. Check the preview before `vercel promote <deployment-url>`. Build failure leaves the current release live.

Previous production for rollback: `dpl_3muAx1QNQMaEJF4hUHou3HxpewPk`, `https://petrovichbrothers-4dvbxsmn7-strangesounds-projects.vercel.app`. Restore it with `vercel rollback <deployment-url>` if needed. Project and domain snapshots are held outside Git; DNS and domain ownership stay unchanged.

## Optional Docker deployment

The live `.com` currently responds through Cloudflare and Vercel; `.ru` runs on FirstVDS. The Docker option below is an alternative hosting path, not a description of the current `.com` setup. Using it would also require changing the `.com` origin/DNS and verifying TLS. The primary publication path now remains Vercel, using the static build described above. The Docker path below is an alternative only.

Build and check the separate image:

```sh
docker build -f Dockerfile.en --build-arg BUILD_COMMIT=<full-sha> -t petrovich-english:commit-<sha> .
PB_EN_RELEASE=petrovich-english:commit-<sha> docker compose -f deploy/compose.en.yml up -d
```

This service uses no SMTP/Telegram credentials. After checking it on a preview hostname, route only `petrovichbrothers.com` and `www.petrovichbrothers.com` to `http://pb-website-en:3000` in the existing Traefik configuration. Preserve the current `.com` image and exact routes for rollback. Check HTTPS, representative projects, redirects, shared media, 404 and all three contact links before changing the live route. Do not change the `.ru`, archive, mail or PB Search routes.

Neither the existing restricted deploy account nor the Russian `deploy/receive.sh` accepts feature branches or publishes this English service. Connecting an automatic `.com` deployment requires an explicit server setup after branch review. The Russian deployment path does not publish the English service; the Vercel publication path is documented above.

English pages have their own canonicals, sitemap and RU/EN alternates. At launch, add reciprocal English alternate links and an EN language switch to the Russian build only for pages present in the released English sitemap. Do not advertise unavailable translations. No geolocation or browser-language redirect is used.

Yandex Metrica and PB Search currently allow only Russian production hosts and remain disabled on `.com`; the English privacy text reflects that. Client marks, historical artwork and embedded video captions may contain Russian as part of the original work. Translate whole sentences when adding new markup where practical; inline emphasis can split a sentence into several catalog entries, so read the assembled paragraph before approving copy.

Client artwork replacements and source URLs are recorded in `client-logos.json`. Eight English marks are supplied; seven marks without verified English artwork retain their original image with a plain English caption. All original case links remain unchanged. Russian text inside original photos, interface recordings and film audio is intentionally preserved.
