import type { MetadataRoute } from 'next';
import { listStations } from '@/lib/driver-api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eplug.mn';

  // Static high-priority pages
  const routes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/stations`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/download`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Dynamic stations pages
  try {
    const res = await listStations();
    if (res?.stations && Array.isArray(res.stations)) {
      for (const station of res.stations) {
        if (!station.id) continue;
        routes.push({
          url: `${baseUrl}/stations/${station.id}`,
          lastModified: station.lastSeenAt ? new Date(station.lastSeenAt) : new Date(),
          changeFrequency: 'daily',
          priority: 0.8,
        });
      }
    }
  } catch {
    // If the backend is not reachable during build time, the static routes are safely returned
  }

  return routes;
}

