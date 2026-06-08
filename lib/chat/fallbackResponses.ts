import { Stock } from '../types';
import { RishiScore } from '../consensus/types';

export function getStaticResponse(rishiId: string, prompt: string, stock: Stock, scores: RishiScore[]): string {
  const myScore = scores.find(s => s.name.toLowerCase().includes(rishiId.slice(0, 4)));
  const score = myScore?.score ?? 50;

  const p = prompt.toLowerCase();
  const isThesis = p.includes('thesis');
  const isRisk = p.includes('risk');

  const LINES: Record<string, Record<string, string>> = {
    jhunjhunwala: {
      buy: score >= 70 ? `Arrey wah! ${stock.symbol} at ${score}/100 — yeh mast hai yaar! ROE ${stock.roe}%, clean sector story. Accumulate on every dip. Yeh multibagger ban sakta hai.` : `${stock.symbol} scores ${score}/100 — abhi nahi. PE ${stock.pe}x is too high for the growth on offer. Wait karo.`,
      risk: `Main risk for ${stock.symbol}: ${stock.de > 1 ? 'Debt at ' + stock.de + 'x D/E — any slowdown hurts equity hard.' : 'Execution risk — management must deliver.'} Also watch sector regulation. But long-term India story remains intact.`,
      thesis: `Jhunjhunwala Thesis — ${stock.symbol}:\n1. Score: ${score}/100\n2. ROE: ${stock.roe}% — ${stock.roe > 18 ? 'Strong' : 'Moderate'}\n3. Growth CAGR: ${stock.revcagr}%\n4. Debt: ${stock.de}x — ${stock.de < 0.5 ? 'Clean' : 'Watch'}\n5. Conviction: ${score >= 75 ? 'BUY with size on dips' : 'Watchlist'}\n\nIndia growth story intact. Patient compounding wins.`,
    },
    damani: {
      buy: score >= 70 ? `${stock.symbol} passes the sleep test at ${score}/100. ROE ${stock.roe}%, D/E ${stock.de}x. ${stock.pe < 25 ? 'Margin of safety exists at PE ' + stock.pe + 'x.' : 'Price is full — wait for better entry.'} Patience compounds.` : `${stock.symbol} at ${score}/100 does not meet my standard. ${stock.de > 0.5 ? 'Debt of ' + stock.de + 'x disturbs me.' : 'ROE ' + stock.roe + '% is insufficient.'} First rule: do not lose money.`,
      risk: `${stock.symbol} permanent loss risk: ${stock.de > 1 ? '(1) Debt refinancing in downturn' : '(1) Competitive margin erosion'}, (2) Management quality degradation, (3) Macro shock. I size positions to survive the worst.`,
      thesis: `Damani Checklist — ${stock.symbol}:\nROE ${stock.roe >= 20 ? '✓' : '✗'} (${stock.roe}%)\nDebt ${stock.de < 0.3 ? '✓' : '✗'} (${stock.de}x)\nPE ${stock.pe < 25 ? '✓' : '✗'} (${stock.pe}x)\nPromoter ${stock.promo > 50 ? '✓' : '✗'} (${stock.promo}%)\n\nVerdict: ${score >= 75 ? 'Accumulate with 5yr horizon' : 'Watchlist — await margin of safety'}.`,
    },
    buffett: {
      buy: score >= 70 ? `${stock.symbol} has a moat worth respecting — ${score}/100. ROE ${stock.roe}% over time suggests pricing power. ${stock.pe < 30 ? 'Fair price for a good business.' : 'Full price, but quality commands premium.'} Would I hold this for 10 years? ${score >= 78 ? 'Yes.' : 'Probably.'}` : `${stock.symbol} at ${score}/100 is not a wonderful business at a fair price. ${stock.roe < 15 ? 'ROE ' + stock.roe + '% suggests no durable moat.' : 'Valuation leaves no room for error.'} Better opportunities exist.`,
      risk: `Three risks for ${stock.symbol}: (1) Moat erosion from competition/tech disruption in ${stock.sector}, (2) Management capital misallocation — check buybacks vs acquisitions, (3) Valuation at PE ${stock.pe}x ${stock.pe > 30 ? 'leaves no margin of safety' : 'is reasonable'}. Promoter ${stock.promo}% ${stock.promo > 50 ? 'aligned' : 'watch'}.`,
      thesis: `Buffett Analysis — ${stock.symbol}:\nMoat: ${stock.roe >= 25 ? 'Wide' : stock.roe >= 15 ? 'Narrow' : 'Questionable'}\nOwner Earnings: ${stock.fcf > 0 ? 'Positive FCF' : 'Needs evaluation'}\nManagement: Promoter ${stock.promo}% ${stock.promo >= 50 ? '— skin in game ✓' : '— watch governance'}\nValuation: ${stock.pe < 20 ? 'Attractive' : stock.pe < 30 ? 'Fair' : 'Full'}\nVerdict: ${score >= 75 ? 'Buy and hold forever' : 'Not yet a wonderful business'}.`,
    },
    munger: {
      buy: `Invert first: what makes ${stock.symbol} a terrible investment? ${stock.de > 1.5 ? 'High debt — one bad year destroys equity.' : stock.pe > 50 ? 'Paying for perfection at PE ' + stock.pe + 'x.' : 'Competition eroding moat.'} Now the answer: ${score >= 70 ? 'Surprisingly, it avoids obvious stupidity. Score ' + score + '/100 passes.' : 'Score ' + score + '/100 — too many risks remain uninverted.'}`,
      risk: `Munger inversion for ${stock.symbol}: failure modes are (1) ${stock.sector} structural disruption nobody sees coming, (2) Incentive misalignment in management — always check options grants vs buybacks, (3) ${stock.de > 0.5 ? 'Leverage amplifying downside' : 'Complacency at good prices'}. Avoiding stupidity beats seeking brilliance.`,
      thesis: `Munger Mental Model — ${stock.symbol}:\nINVERT: Failure requires ${stock.de > 1 ? 'debt spiral' : 'moat collapse'} + ${stock.pe > 40 ? 'valuation mean reversion' : 'earnings miss'} + governance breakdown\nPROBABILITY of avoiding all: ${score >= 75 ? 'High' : 'Moderate'}\nOPPORTUNITY COST vs index: ${score >= 70 ? 'Favorable' : 'Unfavorable'}\nVERDICT: ${score >= 70 ? 'Small position — monitor intensely' : 'Avoid — better to miss than lose permanently'}.`,
    },
    chanos: {
      buy: `Short thesis check for ${stock.symbol}: Overvalued? PE ${stock.pe}x ${stock.pe > 40 ? '— YES, significantly.' : '— Reasonable.'} Deteriorating fundamentals? CAGR ${stock.revcagr}% ${stock.revcagr < 5 ? '— Slowing.' : '— Intact.'} Accounting flags? D/E ${stock.de}x ${stock.de > 2 ? '— Elevated, check footnotes.' : '— Clean.'}\nShort conviction: ${score >= 70 ? 'ZERO — this is quality, wrong side to be on.' : 'LOW-MODERATE — watchlist for catalysts.'}`,
      risk: `For ${stock.symbol} short risk (squeeze/positive catalyst): ${stock.promo > 60 ? 'High promoter holding — they can support price.' : 'Retail momentum could persist.'} Also watch for: M&A activity, regulatory approval, index inclusion. I only short when narrative is provably false AND catalyst is imminent.`,
      thesis: `Chanos Short Checklist — ${stock.symbol}:\nOvervaluation: ${stock.pe > 40 ? 'YES — PE ' + stock.pe + 'x' : 'NO'}\nFundamental Decay: ${stock.revcagr < 0 ? 'YES' : 'NO'}\nAccounting Red Flags: ${stock.de > 2 ? 'Possible — high debt' : 'Clean'}\nNarrative Gap: ${stock.pe > 40 && stock.revcagr < 10 ? 'Wide — market believes story numbers dont support' : 'Aligned'}\nShort Rating: ${score >= 75 ? 'AVOID SHORT — quality business' : score >= 50 ? 'MONITOR' : 'POTENTIAL SHORT'}.`,
    },
    lynch: {
      buy: `${stock.symbol} — is this a GARP opportunity? Growth ${stock.revcagr}%, PE ${stock.pe}x, PEG ${stock.revcagr > 0 ? (stock.pe / stock.revcagr).toFixed(1) : 'N/A'}. ${stock.pe > 0 && stock.revcagr > 0 && (stock.pe / stock.revcagr) < 1 ? 'Excellent PEG under 1 — growth cheaply priced!' : 'PEG over 1 — paying up for growth.'} Score ${score}/100. ${stock.mktcap < 50000 ? 'Still small enough to be undiscovered.' : 'Well-known — institutions already in.'}`,
      risk: `GARP risk for ${stock.symbol}: growth rate must continue to justify PE ${stock.pe}x. Watch for: competition entering ${stock.sector}, management distraction, institutional crowding ${stock.mktcap > 100000 ? '(already large cap)' : '(still manageable)'}. Best stocks are ones your neighbour doesn't know yet.`,
      thesis: `Lynch GARP Analysis — ${stock.symbol}:\nGrowth: ${stock.revcagr}% CAGR — ${stock.revcagr > 20 ? 'Tenbagger potential' : stock.revcagr > 12 ? 'Solid' : 'Moderate'}\nPE: ${stock.pe}x — ${stock.pe < 20 ? 'Cheap' : stock.pe < 30 ? 'Fair' : 'Full'}\nPEG: ${stock.revcagr > 0 ? (stock.pe / stock.revcagr).toFixed(1) : 'N/A'} — ${stock.revcagr > 0 && (stock.pe / stock.revcagr) < 1.2 ? 'Attractive' : 'Elevated'}\nDiscovery: ${stock.mktcap < 20000 ? 'Early — huge upside' : 'Late — priced in'}\nVerdict: ${score >= 70 ? 'Accumulate — GARP opportunity' : 'Wait for better price/growth combo'}.`,
    },
    soros: {
      buy: `Reflexivity lens on ${stock.symbol}: the market's belief in ${stock.sector} growth is ${score >= 70 ? 'creating a self-fulfilling cycle — stock rising attracts capital, enabling real growth, justifying higher prices. Ride the boom phase.' : 'diverging from fundamentals — narrative stronger than numbers. The reflexive reversal is coming.'}  Score ${score}/100. Macro cycle: ${stock.revcagr > 15 ? 'Early growth, tailwinds intact.' : 'Maturing, watch for regime change.'}`,
      risk: `Soros macro risks for ${stock.symbol}: (1) Central bank policy shift — RBI rate changes affect ${stock.sector} valuations, (2) Reflexive reversal — if sentiment turns, prices fall faster than fundamentals, (3) Geopolitical capital flow disruption. I size based on conviction and exit fast when wrong.`,
      thesis: `Soros Reflexivity Framework — ${stock.symbol}:\nMarket Bias: ${score >= 70 ? 'Positive feedback loop — expectations driving real growth' : 'Neutral to negative reflexivity'}\nCycle Phase: ${stock.revcagr > 20 ? 'Boom early innings' : stock.revcagr > 10 ? 'Mid cycle' : 'Late or turning'}\nPolicy Support: ${stock.sector === 'Banking' ? 'RBI-sensitive' : stock.sector === 'IT' ? 'USD-INR and US demand driven' : 'Domestic demand driven'}\nPosition: ${score >= 70 ? 'Long with trailing stop — ride the reflexive boom' : 'Neutral — wait for clear directional bias'}.`,
    },
  };

  const lines = LINES[rishiId] as Record<string, string> | undefined;
  if (!lines) return `${stock.symbol} scores ${score}/100. Ask me something specific about valuation, risks, or investment thesis.`;

  if (isThesis) return lines.thesis || lines.buy;
  if (isRisk) return lines.risk || lines.buy;
  return lines.buy;
}