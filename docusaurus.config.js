// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

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
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Docs',
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
