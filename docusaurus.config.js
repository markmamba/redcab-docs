// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';
import optionARedirects from './scripts/option-a-redirects.json';

/** Map legacy paths to valid Docusaurus routes (category indexes use trailing `/`). */
const redirectTargetFixes = {
  '/docs/engineering/specs/README': '/docs/engineering/specs/',
  '/docs/engineering/specs/_template': '/docs/engineering/specs/',
  '/docs/engineering/specs/iam/iam-audit-2026-08/index':
    '/docs/engineering/specs/iam/iam-audit-2026-08/',
  '/docs/product/business-rules/': '/docs/product/business-rules/glossary',
  '/docs/architecture/domain/': '/docs/architecture/domain/domain-models',
  '/docs/product/requirements': '/docs/product/requirements/',
  '/docs/product/planning/roadmap': '/docs/product/planning/roadmap/',
  '/docs/engineering/specs': '/docs/engineering/specs/',
};

const extraRedirects = [
  {from: '/docs/requirements', to: '/docs/product/requirements/'},
  {from: '/docs/roadmap', to: '/docs/product/planning/roadmap/'},
  {from: '/docs/business-rules/glossary', to: '/docs/product/business-rules/glossary'},
  {from: '/docs/business-rules/invariants', to: '/docs/product/business-rules/invariants'},
  {from: '/docs/domain/domain-models', to: '/docs/architecture/domain/domain-models'},
  {from: '/docs/specs', to: '/docs/engineering/specs/'},
];

/** Deduplicate redirects that would write the same HTML file (e.g. `/foo` vs `/foo/`). */
const redirects = [...optionARedirects, ...extraRedirects]
  .map(({from, to}) => ({
    from,
    to: redirectTargetFixes[to] ?? to,
  }))
  .filter(({to}) => !to.includes('_template'))
  .filter(({from}, i, arr) => {
    const key = from.replace(/\/$/, '') || from;
    return arr.findIndex((r) => (r.from.replace(/\/$/, '') || r.from) === key) === i;
  });

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Red Cab Docs',
  tagline: 'Planning, architecture, and engineering documentation',
  favicon: 'img/redcab-orig-logo.png',

  future: {
    v4: true,
  },

  url: 'https://markmamba.github.io',
  baseUrl: '/redcab-docs/',

  organizationName: 'markmamba',
  projectName: 'redcab-docs',

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  themes: ['@docusaurus/theme-mermaid'],

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects,
      },
    ],
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/redcab-orig-logo.png',
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Red Cab Docs',
        logo: {
          alt: 'Red Cab Docs',
          src: 'img/redcab-logo-outlined.png',
          href: '/redcab-docs/docs/',
        },
        items: [
          {
            type: 'doc',
            docId: 'index',
            position: 'left',
            label: 'Home',
          },
          {
            type: 'docSidebar',
            sidebarId: 'productSidebar',
            position: 'left',
            label: 'Product',
          },
          {
            type: 'docSidebar',
            sidebarId: 'architectureSidebar',
            position: 'left',
            label: 'Architecture',
          },
          {
            type: 'docSidebar',
            sidebarId: 'engineeringSidebar',
            position: 'left',
            label: 'Engineering',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Copyright © ${new Date().getFullYear()} Red Cab Marketplace.`,
      },
      mermaid: {
        theme: {light: 'base', dark: 'dark'},
        options: {
          themeVariables: {
            primaryColor: '#c8102e',
            primaryTextColor: '#ffffff',
            primaryBorderColor: '#8c0b20',
            lineColor: '#c8102e',
            secondaryColor: '#f5f5f5',
            tertiaryColor: '#ffffff',
          },
        },
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
