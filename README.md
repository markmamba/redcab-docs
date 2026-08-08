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

Live site: [https://markmamba.github.io/redcab-docs/](https://markmamba.github.io/redcab-docs/)

### GitHub Pages setup (one-time)

1. Open **Settings → Pages** in the `markmamba/redcab-docs` repository.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. Leave **Custom domain** empty until DNS for `docs.redcab.com` is ready.

### Custom domain (later)

When DNS is configured for `docs.redcab.com`:

1. Set `url` to `https://docs.redcab.com` and `baseUrl` to `/` in `docusaurus.config.js`.
2. Add `static/CNAME` containing `docs.redcab.com`.
3. Add a CNAME record: `docs` → `markmamba.github.io`.
4. Set the custom domain in **Settings → Pages** and enable **Enforce HTTPS** once verified.

### Manual deploy check

```bash
npm run build
npm run serve
```
