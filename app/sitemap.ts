import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://sammystorelogs.com';
  const staticRoutes = [
    '',
    '/numbers',
    '/smm',
    '/accounts',
    '/logs',
    '/catalog',
    '/search',
    '/login',
    '/register',
    '/terms',
    '/privacy',
    '/refund-policy',
    '/support',
  ];

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : 0.7,
  }));
}
