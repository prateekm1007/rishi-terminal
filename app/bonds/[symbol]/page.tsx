import { Metadata } from "next";
import { notFound } from "next/navigation";

import { BONDS } from "@/data/bonds";
import { adaptBond } from "@/lib/adapters/bondAdapter";
import { buildUniversalConsensus } from "@/lib/consensus/universalConsensus";

import { AssetTerminal } from "@/components/terminal/AssetTerminal";

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
    return {
      title: "Bond Not Found",
    };
  }

  return {
    title: `${bond.name} - Bond Analysis | Rishi Terminal`,
    description: `${bond.name} government bond analysis with yield, duration, spread, and Rishi consensus scoring.`,
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

  const asset = adaptBond(bond);

  const consensus = buildUniversalConsensus(asset);

  return (
    <AssetTerminal
      asset={asset}
      consensus={consensus as any}
      detail={{
        description: `${bond.name} is a ${bond.type} bond issued by ${bond.issuer} with a yield to maturity of ${bond.ytm}% and duration of ${bond.duration} years.`,
        metadata: {
          issuer: bond.issuer,
          type: bond.type,
          country: bond.country,
          maturityYears: bond.maturityYears,
          maturityDate: bond.maturityDate,
          couponRate: bond.couponRate,
          ytm: bond.ytm,
          duration: bond.duration,
          spread: bond.spread,
          rating: bond.rating,
          riskRating: bond.riskRating,
        },
      }}
    />
  );
}