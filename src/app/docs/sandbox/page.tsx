import type { Metadata } from 'next';
import { SandboxView } from './sandbox-view';
import { publicEnv } from '@/lib/env';

export async function generateMetadata(): Promise<Metadata> {
  const brand = publicEnv.brandName || 'Eplug';
  return {
    title: `API Sandbox & Simulator — ${brand}`,
    description:
      'Eplug Partner API-ийг өгөгдлийн сан болон бодит станцад нөлөөлөхгүйгээр санах ойд интерактив байдлаар туршиж үзэх симулятор орчин.',
  };
}

export default function SandboxPage() {
  return <SandboxView />;
}
