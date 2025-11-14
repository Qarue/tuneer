export const siteConfig = {
  name: 'Tuneer',
  shortName: 'Tuneer',
  tagline: 'Browser Toolkit',
  description:
    'Tuneer is a privacy-first toolkit of in-browser utilities for PDFs, text encoding, images, and identity photos—no uploads, just fast results.',
  url: 'https://tuneer.vercel.app',
  socialImage: 'https://tuneer.vercel.app/social-card.svg',
  keywords: [
    'browser tools',
    'pdf editor',
    'pdf compressor',
    'image converter',
    'passport photo maker',
    'base64 encoder',
    'jwt decoder',
    'privacy first utilities',
  ],
  seoDefaults: {
    title: 'Tuneer Toolkit | Browser Toolkit',
    description:
      'Privacy-first browser utilities for PDFs, images, text encoding, and identity photos.',
    canonical: 'https://tuneer.vercel.app/',
  },
}

export type SiteConfig = typeof siteConfig
