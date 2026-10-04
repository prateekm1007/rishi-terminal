import { Metadata } from "next";
import { notFound } from "next/navigation";

import { BONDS } from "@/data/bonds";
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

  return {
    title: `${bond.name} - Bond Analysis | Rishi Terminal`,
    description: `${bond.name} bond analysis`,
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