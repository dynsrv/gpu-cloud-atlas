# Vercel bootstrap

`index.template.html` is the page Vercel serves at `/`. Replace `__V__` with the first 7 characters of the
commit SHA, and point the rewrite in `vercel.json` at `https://cdn.jsdelivr.net/gh/dynsrv/gpu-cloud-atlas@<full sha>/:path*`.
The SEO and social-sharing tags (title, description, Open Graph, Twitter card, JSON-LD) live here, because
crawlers read the first HTML response; `og.jpg` (1200×630) is the share image.
