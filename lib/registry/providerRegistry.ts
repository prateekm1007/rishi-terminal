/**
 * Central provider registry — Phase 5 T43.
 *
 * Single source of truth for every data/AI provider the application knows
 * about, its approval status, and its terms. No page may hard-code provider
 * selection; routing consults this registry (directly or via lib/ai and the
 * canonical data service).
 *
 * Decisions and evidence: docs/FREE_OPEN_DATA_RESEARCH.md +
 * docs/DATA_PROVIDER_MATRIX.md (T35/T64). A provider may enter production
 * routing only with status APPROVED (T55); RESEARCH_ONLY entries are listed
 * so future work starts from evidence, not marketing pages.
 */

export interface ProviderDefinition {
  id: string;
  datasets: string[];
  assetClasses: string[];
  auth: "none" | "api-key" | "oauth";
  status: "APPROVED" | "RESEARCH_ONLY" | "REJECTED";
  maxRequestsPerMinute?: number;
  maxRequestsPerDay?: number;
  termsUrl: string;
  docsUrl: string;
}

export const PROVIDER_IDS = {
  NSE: "nse",
  BSE: "bse",
  YAHOO: "yahoo",
  SCREENER: "screener",
  COINGECKO: "coingecko",
  EXCHANGERATE_API: "exchangerate-api",
  FRED_CSV: "fred-csv",
  FRED_API: "fred-api",
  ECB_FX: "ecb-fx",
  RSS_NEWS: "rss-news",
  FMP: "fmp",
  FINNHUB: "finnhub",
  ALPHAVANTAGE: "alphavantage",
  TWELVEDATA: "twelvedata",
  CHAT_API: "chat-api",
  GEMINI: "gemini",
  HUGGINGFACE: "huggingface",
} as const;

export const PROVIDER_REGISTRY: Record<string, ProviderDefinition> = {
  [PROVIDER_IDS.NSE]: {
    id: PROVIDER_IDS.NSE,
    datasets: ["equity-quotes", "indices", "breadth", "block-deals", "mcx-derivatives"],
    assetClasses: ["equity-in", "index-in", "commodity-in"],
    auth: "none",
    status: "APPROVED",
    termsUrl: "https://www.nseindia.com/",
    docsUrl: "https://www.nseindia.com/",
  },
  [PROVIDER_IDS.BSE]: {
    id: PROVIDER_IDS.BSE,
    datasets: ["scrip-header"],
    assetClasses: ["equity-in"],
    auth: "none",
    status: "APPROVED",
    termsUrl: "https://www.bseindia.com/",
    docsUrl: "https://api.bseindia.com/",
  },
  [PROVIDER_IDS.YAHOO]: {
    id: PROVIDER_IDS.YAHOO,
    datasets: ["quotes", "daily-change", "ohlcv-history", "fx-pairs"],
    assetClasses: ["equity-in", "equity-us", "index", "fx", "commodity"],
    auth: "none",
    status: "APPROVED",
    termsUrl: "https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html",
    docsUrl: "https://query1.finance.yahoo.com/",
  },
  [PROVIDER_IDS.SCREENER]: {
    id: PROVIDER_IDS.SCREENER,
    datasets: ["fundamentals-in"],
    assetClasses: ["equity-in"],
    auth: "none",
    status: "RESEARCH_ONLY",
    termsUrl: "https://www.screener.in/terms/",
    docsUrl: "https://www.screener.in/",
  },
  [PROVIDER_IDS.COINGECKO]: {
    id: PROVIDER_IDS.COINGECKO,
    datasets: ["crypto-prices", "crypto-24h-change"],
    assetClasses: ["crypto"],
    auth: "none",
    status: "APPROVED",
    maxRequestsPerMinute: 30,
    termsUrl: "https://www.coingecko.com/en/api_terms",
    docsUrl: "https://docs.coingecko.com/",
  },
  [PROVIDER_IDS.EXCHANGERATE_API]: {
    id: PROVIDER_IDS.EXCHANGERATE_API,
    datasets: ["fx-reference-rates"],
    assetClasses: ["fx"],
    auth: "none",
    status: "APPROVED",
    maxRequestsPerDay: 1500,
    termsUrl: "https://www.exchangerate-api.com/terms",
    docsUrl: "https://www.exchangerate-api.com/docs/free",
  },
  [PROVIDER_IDS.FRED_CSV]: {
    id: PROVIDER_IDS.FRED_CSV,
    datasets: ["us-treasury-yields", "macro-series"],
    assetClasses: ["bond", "macro"],
    auth: "none",
    status: "APPROVED",
    termsUrl: "https://fred.stlouisfed.org/terms-of-use",
    docsUrl: "https://fred.stlouisfed.org/graph/fredgraph.csv",
  },
  [PROVIDER_IDS.FRED_API]: {
    id: PROVIDER_IDS.FRED_API,
    datasets: ["macro-series"],
    assetClasses: ["macro"],
    auth: "api-key",
    status: "RESEARCH_ONLY",
    termsUrl: "https://fred.stlouisfed.org/terms-of-use",
    docsUrl: "https://fred.stlouisfed.org/docs/api/fred/",
  },
  [PROVIDER_IDS.ECB_FX]: {
    id: PROVIDER_IDS.ECB_FX,
    datasets: ["eur-fx-reference-rates"],
    assetClasses: ["fx"],
    auth: "none",
    status: "APPROVED",
    termsUrl: "https://www.ecb.europa.eu/terms/html/index.en.html",
    docsUrl: "https://www.ecb.europa.eu/stats/eurofxref/",
  },
  [PROVIDER_IDS.RSS_NEWS]: {
    id: PROVIDER_IDS.RSS_NEWS,
    datasets: ["news-headlines"],
    assetClasses: ["news"],
    auth: "none",
    status: "APPROVED",
    termsUrl: "https://policies.google.com/terms",
    docsUrl: "https://support.google.com/news/answer/4597390",
  },
  [PROVIDER_IDS.FMP]: {
    id: PROVIDER_IDS.FMP,
    datasets: ["fundamentals-us"],
    assetClasses: ["equity-us"],
    auth: "api-key",
    status: "RESEARCH_ONLY",
    termsUrl: "https://site.financialmodelingprep.com/terms",
    docsUrl: "https://site.financialmodelingprep.com/developer/docs",
  },
  [PROVIDER_IDS.FINNHUB]: {
    id: PROVIDER_IDS.FINNHUB,
    datasets: ["quotes"],
    assetClasses: ["equity-us", "equity-in"],
    auth: "api-key",
    status: "REJECTED",
    maxRequestsPerMinute: 60,
    termsUrl: "https://finnhub.io/terms-of-service",
    docsUrl: "https://finnhub.io/docs/api",
  },
  [PROVIDER_IDS.ALPHAVANTAGE]: {
    id: PROVIDER_IDS.ALPHAVANTAGE,
    datasets: ["equities", "fx", "macro"],
    assetClasses: ["equity-us", "fx", "macro"],
    auth: "api-key",
    status: "RESEARCH_ONLY",
    maxRequestsPerDay: 25,
    termsUrl: "https://www.alphavantage.co/terms/",
    docsUrl: "https://www.alphavantage.co/documentation/",
  },
  [PROVIDER_IDS.TWELVEDATA]: {
    id: PROVIDER_IDS.TWELVEDATA,
    datasets: ["quotes", "ohlcv", "fx", "crypto"],
    assetClasses: ["equity-us", "fx", "crypto"],
    auth: "api-key",
    status: "RESEARCH_ONLY",
    maxRequestsPerMinute: 8,
    maxRequestsPerDay: 800,
    termsUrl: "https://twelvedata.com/terms-of-service",
    docsUrl: "https://twelvedata.com/docs",
  },
  [PROVIDER_IDS.CHAT_API]: {
    id: PROVIDER_IDS.CHAT_API,
    datasets: ["llm-chat"],
    assetClasses: ["ai"],
    auth: "api-key",
    status: "APPROVED",
    // Commit M7 (model-identity audit): the production endpoint is
    // apihub.agnes-ai.com (an OpenAI-COMPATIBLE aggregator), NOT OpenAI
    // itself — the previous openai.com URLs misdescribed the provider.
    // Verified live 2026-10-02: /models lists agnes-* models and
    // completions echo the configured model (evidence:
    // docs/evidence/commit-m/model-identity-audit.json). FD-8 (vendor
    // terms review) remains OPEN.
    termsUrl: "https://agnes-ai.com/",
    docsUrl: "https://apihub.agnes-ai.com/",
  },
  [PROVIDER_IDS.GEMINI]: {
    id: PROVIDER_IDS.GEMINI,
    datasets: ["llm-chat-fallback"],
    assetClasses: ["ai"],
    auth: "api-key",
    status: "APPROVED",
    termsUrl: "https://ai.google.dev/terms",
    docsUrl: "https://ai.google.dev/gemini-api/docs",
  },
  [PROVIDER_IDS.HUGGINGFACE]: {
    id: PROVIDER_IDS.HUGGINGFACE,
    datasets: ["open-weight-models", "embeddings", "ner", "rerankers"],
    assetClasses: ["ai"],
    auth: "api-key",
    status: "RESEARCH_ONLY",
    termsUrl: "https://huggingface.co/terms-of-service",
    docsUrl: "https://huggingface.co/docs/inference-providers",
  },
};

export function getProviderDefinition(id: string): ProviderDefinition | undefined {
  return PROVIDER_REGISTRY[id];
}

/** T43/T55: only APPROVED providers may serve production routing. */
export function isProviderApproved(id: string): boolean {
  return PROVIDER_REGISTRY[id]?.status === "APPROVED";
}

export function approvedProviders(): ProviderDefinition[] {
  return Object.values(PROVIDER_REGISTRY).filter(p => p.status === "APPROVED");
}
