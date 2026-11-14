# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

## Installation

```bash
npm install
```

**Note**: feel free to use the package manager of your choice.

## Local Development

```bash
npm run start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Deployment

Production deploys run automatically via GitHub Actions on every push to `main`.

Live site: [https://docs.redcab.app](https://docs.redcab.app)

### GitHub Pages setup

1. Open **Settings → Pages** in the `markmamba/redcab-docs` repository.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. Set **Custom domain** to `docs.redcab.app`.
4. Turn on **Enforce HTTPS** when GitHub finishes the DNS check.

### Custom domain

The domain `redcab.app` is managed in Cloudflare.

- `docusaurus.config.js` sets `url` to `https://docs.redcab.app` and `baseUrl` to `/`.
- `static/CNAME` contains `docs.redcab.app`.
- Cloudflare has a `CNAME` record: `docs` → `markmamba.github.io`.
- The Cloudflare SSL/TLS mode is **Full (strict)** when the record is proxied.

### Manual deploy check

```bash
npm run build
npm run serve
```
