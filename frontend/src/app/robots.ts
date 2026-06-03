import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
      {
        userAgent: ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended'],
        allow: '/',
      }
    ],
    sitemap: 'https://pathersaathi.in/sitemap.xml',
  }
}
