# Vercel bootstrap

`index.template.html` is the page Vercel serves at `/`. Replace `__V__` with the first 7 characters of the
commit SHA, and point the rewrite in `vercel.json` at `https://cdn.jsdelivr.net/gh/dynsrv/gpu-cloud-atlas@<full sha>/:path*`.
The SEO and social-sharing tags (title, description, Open Graph, Twitter card, JSON-LD) live here, because
crawlers read the first HTML response; `og.jpg` (1200×630) is the share image.

## Build and deploy (performance setup)
1. `tools/build.sh` minifies `app.js`, `dash-runtime.js` and `styles.css` into `*.min.*` (commit the outputs; sources stay readable).
2. Commit and push, then run `tools/prepare_deploy.py <full commit sha>`. It writes `deploy/out/index.html` and `deploy/out/vercel.json`.
   Code files are cache-busted by the commit sha; every dataset gets its own content hash (`window.__DV`), so a deploy only
   re-downloads the datasets that changed.
3. Deploy those two files to Vercel (the rewrite serves everything else from jsDelivr at that commit).

Loading order (`dash-runtime.js`): the six datasets the first screen draws (providers, prices, gpu_families, countries, world_map,
dc_cities) load together and render once; logos, flags, provider profiles and the datasheet load afterwards at idle and render in a
single batch. Deep links to the datasheet or a provider profile pull the datasets they need into the first batch.
