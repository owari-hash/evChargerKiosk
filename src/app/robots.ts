import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eplug.mn';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/account', '/app-api', '/verify-email', '/delete-account', '/c/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

