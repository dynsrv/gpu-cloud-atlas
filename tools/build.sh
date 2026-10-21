#!/bin/sh
# Minify the three source files next to themselves (app.js -> app.min.js, ...). Sources stay readable; the deploy serves *.min.*.
set -e
cd "$(dirname "$0")/.."
E=${ESBUILD:-"npx --yes esbuild@0.24.0"}
$E app.js --minify --legal-comments=none --target=es2020 --outfile=app.min.js
$E dash-runtime.js --minify --legal-comments=none --target=es2020 --outfile=dash-runtime.min.js
$E styles.css --minify --legal-comments=none --outfile=styles.min.css
ls -l app.min.js dash-runtime.min.js styles.min.css
