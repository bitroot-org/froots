// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/**
 * Docs live inside the froots deployment itself — not on GitHub Pages —
 * and each server in the fleet owns its own section at /<server>/docs.
 * The fleet-wide pages (connect, operations) sit at /docs.
 *
 * Adding a server to the fleet: create `content/<name>/`, then add one
 * entry here. Its sidebar and navbar link follow automatically.
 */
const SERVERS = [
  {id: 'bit-graphics', label: 'bit-graphics'},
  {id: 'bit-voice', label: 'bit-voice'},
  {id: 'heartbit', label: 'heartbit'},
  {id: 'teamlife', label: 'teamlife'},
];

const editUrl = 'https://github.com/bitroot-org/froots/tree/main/docs/';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'froots',
  tagline: "Bitroot's hosted MCP fleet — capabilities for every agent, one URL each",
  favicon: 'img/favicon.ico',
  // Served by the froots Express app itself, mounted at the domain root.
  url: 'https://froots.bitroot.club',
  baseUrl: '/',
  organizationName: 'bitroot-org',
  projectName: 'froots',
  // Emit `docs/index.html` rather than `docs.html`. /docs is also a real
  // directory (it holds connect/, operations/), so directory-style output
  // is what lets a plain static mount resolve both it and its children.
  trailingSlash: true,
  // Kept at 'warn', not 'ignore': the checker still catches genuinely bad
  // doc-to-doc links. The one expected false positive is `/` — the navbar
  // title links to it and it is served by Express (the landing page), so
  // Docusaurus cannot see it in its own route table.
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  i18n: {defaultLocale: 'en', locales: ['en']},
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        // The fleet-wide instance. Per-server instances are registered as
        // plugins below so each gets its own route base.
        docs: {
          path: 'content/fleet',
          routeBasePath: '/docs',
          sidebarPath: './sidebars/auto.js',
          editUrl,
        },
        blog: false,
        theme: {customCss: './src/css/custom.css'},
      }),
    ],
  ],
  plugins: SERVERS.map((server) => [
    '@docusaurus/plugin-content-docs',
    /** @type {import('@docusaurus/plugin-content-docs').Options} */
    ({
      id: server.id,
      path: `content/${server.id}`,
      routeBasePath: `${server.id}/docs`,
      sidebarPath: './sidebars/auto.js',
      editUrl,
    }),
  ]),
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {defaultMode: 'dark', respectPrefersColorScheme: true},
      navbar: {
        title: 'froots',
        items: [
          {to: '/docs', label: 'Fleet', position: 'left'},
          ...SERVERS.map((server) => ({
            to: `/${server.id}/docs`,
            label: server.label,
            position: /** @type {const} */ ('left'),
          })),
          {href: '/', label: 'landing', position: 'right'},
          {href: 'https://github.com/bitroot-org/froots', label: 'GitHub', position: 'right'},
        ],
      },
      footer: {
        style: 'dark',
        copyright: 'Bitroot — froots MCP fleet',
      },
      prism: {theme: prismThemes.github, darkTheme: prismThemes.dracula},
    }),
};

export default config;
