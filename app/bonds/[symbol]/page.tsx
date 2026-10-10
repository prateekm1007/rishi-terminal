import { Metadata } from "next";
import { notFound } from "next/navigation";

import { BONDS } from "@/data/bonds";
import { SITE_URL } from "@/lib/seo/site";
import { BondDetailClient } from "@/components/bonds/BondDetailClient";
import { NamespaceProvider } from "@/components/shared/NamespaceProvider";
import { chart } from "@/messages/en.json";

// X4 (Round 11): the bond detail tree's dictionary namespace (the chart
// labels under AssetPriceChart) arrives as an RSC prop — see the homepage's
// note in app/page.tsx.

interface PageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateStaticParams() {
  return BONDS.map((bond) => ({
    symbol: bond.symbol,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { symbol } = await params;

  const bond = BONDS.find(
    (b) => b.symbol.toUpperCase() === symbol.toUpperCase()
  );

  if (!bond) {
    return { title: "Bond Not Found" };
  }

  // WP1 (founder round 2026-10-10): the detail URL names itself — the
  // canonical was the parent /bonds section and og inherited the site-root
  // defaults. Absolute form matches the U5 pinned detail-page convention.
  const canonicalUrl = `${SITE_URL}/bonds/${encodeURIComponent(bond.symbol)}`;
  return {
    title: `${bond.name} - Bond Analysis | Rishi Terminal`,
    description: `${bond.name} bond analysis`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${bond.name} - Bond Analysis | Rishi Terminal`,
      description: `${bond.name} bond analysis`,
      url: canonicalUrl,
      type: "article",
    },
  };
}

export default async function BondPage({
  params,
}: PageProps) {
  const { symbol } = await params;

  const bond = BONDS.find(
    (b) => b.symbol.toUpperCase() === symbol.toUpperCase()
  );

  if (!bond) {
    notFound();
  }

  return (
    <NamespaceProvider ns={{ chart }}>
      <BondDetailClient bond={bond} />
    </NamespaceProvider>
  );
}