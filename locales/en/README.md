# English edition

The English site targets exhibition stand builders, producers and museum teams, primarily in the CIS, China and the Middle East. It uses the Russian site's layout, routes, media and application code. No subtitles or new voiceovers are added. Film audio and text inside original media remain in their original language.

Public contacts: Arseny, `ars@petrovichbrothers.com`, `https://t.me/ArsenyPetrovich`, `https://wa.me/79268521102`. The English edition has direct contact links instead of the Russian callback form. Its contact API is disabled. Prices are indicative RUB budgets; no exchange-rate conversion or international contract terms are invented.

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

## Deployment preparation

Build and check the separate image:

```sh
docker build -f Dockerfile.en --build-arg BUILD_COMMIT=<full-sha> -t petrovich-english:commit-<sha> .
PB_EN_RELEASE=petrovich-english:commit-<sha> docker compose -f deploy/compose.en.yml up -d
```

This service uses no SMTP/Telegram credentials. After checking it on a preview hostname, route only `petrovichbrothers.com` and `www.petrovichbrothers.com` to `http://pb-website-en:3000` in the existing Traefik configuration. Preserve the current `.com` image and exact routes for rollback. Check HTTPS, representative projects, redirects, shared media, 404 and all three contact links before changing the live route. Do not change the `.ru`, archive, mail or PB Search routes.

Neither the existing restricted deploy account nor the Russian `deploy/receive.sh` accepts feature branches or publishes this English service. Connecting an automatic `.com` deployment requires an explicit server setup after branch review. This branch does not change production routes or publish itself.

English pages have their own canonicals, sitemap and RU/EN alternates. At launch, add reciprocal English alternate links and an EN language switch to the Russian build only for pages present in the released English sitemap. Do not advertise unavailable translations. No geolocation or browser-language redirect is used.

Yandex Metrica and PB Search currently allow only Russian production hosts and remain disabled on `.com`; the English privacy text reflects that. Client marks, historical artwork and embedded video captions may contain Russian as part of the original work. Translate whole sentences when adding new markup where practical; inline emphasis can split a sentence into several catalog entries, so read the assembled paragraph before approving copy.
