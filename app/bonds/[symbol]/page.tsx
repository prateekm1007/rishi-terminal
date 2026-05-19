import { Metadata } from "next";
import { BONDS } from "@/data/bonds";
import { AssetTerminal } from "@/components/terminal/AssetTerminal";
import { adaptBond } from "@/lib/adapters/bondAdapter";

export async function generateStaticParams() {
  return BONDS.map((bond) => ({ symbol: bond.symbol }));
}

export async function generateMetadata({
  params,
}: {
  params: { symbol: string };
}): Promise<Metadata> {
  const bond = BONDS.find((b) => b.symbol === params.symbol);
  if (!bond) return { title: "Bond Not Found" };

  return {
    title: `${bond.name} - Bond Analysis | Rishi Terminal`,
    description: `Detailed analysis of ${bond.name} with Rishi scoring and yield insights.`,
  };
}

export default function BondPage({
  params,
}: {
  params: { symbol: string };
}) {
  const bond = BONDS.find((b) => b.symbol === params.symbol);

  if (!bond) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Bond Not Found</h1>
          <p className="text-gray-400 mt-2">Symbol: {params.symbol}</p>
        </div>
      </div>
    );
  }

  const asset = adaptBond(bond);

  return <AssetTerminal asset={asset} />;
}