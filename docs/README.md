# GitHub Pages source

This folder is served at <https://ds009.github.io/side-link-preview/> via
GitHub Pages. To enable it:

1. Push this folder to `main`
2. GitHub repo → **Settings → Pages**
3. *Source*: **Deploy from a branch**
4. *Branch*: **main**, *Folder*: **/docs**
5. Save. The URL appears within ~1 minute.

After the Chrome Web Store listing is approved, replace
`jpbekmkggadbfacnnlnkjhdkgaoonapn` in `index.html` with the real extension ID
(it shows up in the Developer Dashboard once published).

The favicon and inline logo reference `icons/icon-128.png`. GitHub Pages
serves only the `/docs` directory, so a copy of the 128 px icon lives at
`docs/icons/icon-128.png`. If you re-export the extension icons, copy the
new 128 px file over this one (a single `cp ../icons/icon-128.png icons/`
from inside `docs/`).
