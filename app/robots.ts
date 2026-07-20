import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/dashboard', '/cart', '/orders', '/settings'],
    },
    sitemap: 'https://sammystorelogs.com/sitemap.xml',
  };
}
