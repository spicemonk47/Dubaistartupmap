# Dubai Startup Map

Interactive map + directory of Dubai's startups, funds and ecosystem hubs.
Single static file — no build step, no dependencies to install.

## Run locally
Open `index.html` in a browser, or:
```
python3 -m http.server 8000
```

## Deploy on GitHub Pages
1. Create a repo and upload these files (`index.html`, `README.md`, `.nojekyll`).
2. Repo → **Settings → Pages** → Source: `Deploy from a branch` → Branch: `main` / `/ (root)`.
3. Site goes live at `https://<user>.github.io/<repo>/`.

## Editing the data
All entries live in the `D` array near the bottom of `index.html`:
```js
["Name","One-line description","Company|Capital|Ecosystem","Sector","Stage","District","domain.com"]
```
Districts and their coordinates are in the `DISTRICTS` object — add a district there first if it's new.

## Logos
Logos are pulled from a favicon service by domain, falling back to an initials monogram.
For real brand marks: add files to `assets/logos/<domain>.png` and point `logoHTML()` at them.

## Submission form
Posts to [FormSubmit](https://formsubmit.co) at the maintainer's email.
**The first submission triggers a one-time activation email that must be confirmed** before mail is delivered.
Change the recipient in the `<form action="...">` attribute.

## Attribution
Map tiles © OpenStreetMap contributors — the attribution control must stay visible.
