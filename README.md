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

Live site: [https://docs.redcab.com](https://docs.redcab.com)

### GitHub Pages setup (one-time)

1. Open **Settings → Pages** in the `markmamba/redcab-docs` repository.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. Set **Custom domain** to `docs.redcab.com` and enable **Enforce HTTPS** once DNS is verified.

### DNS setup (one-time)

At your DNS provider for `redcab.com`, add:

| Type  | Name | Value                 |
| ----- | ---- | --------------------- |
| CNAME | docs | markmamba.github.io   |

GitHub may take a few minutes to verify the domain after DNS propagates.

### Manual deploy check

```bash
npm run build
npm run serve
```
