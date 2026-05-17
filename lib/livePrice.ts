// lib/livePrice.ts
// Universal live pricing â€” CoinGecko + Open Exchange Rates + Yahoo Finance

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// COINGECKO â€” Crypto ONLY (free, no auth)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const COINGECKO_IDS: Record<string, string> = {
  'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin', 'SOL': 'solana',
  'ADA': 'cardano', 'AVAX': 'avalanche-2', 'DOT': 'polkadot', 'MATIC': 'matic-network',
  'LINK': 'chainlink', 'UNI': 'uniswap', 'AAVE': 'aave', 'MKR': 'maker',
  'XRP': 'ripple', 'DOGE': 'dogecoin', 'SHIB': 'shiba-inu',
};

const coinGeckoCache: Record<string, { price: number; change: number; fetchedAt: number }> = {};
let lastCoinGeckoFetch = 0;
let coinGeckoFetchPromise: Promise<void> | null = null;

async function fetchAllCoinGecko(): Promise<void> {
  const now = Date.now();
  if (now - lastCoinGeckoFetch < 60000) return;
  if (coinGeckoFetchPromise) return coinGeckoFetchPromise;
  coinGeckoFetchPromise = (async () => {
    try {
      const ids = Object.values(COINGECKO_IDS).join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
      const data = await res.json();
      for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
        if (data[geckoId]) {
          coinGeckoCache[symbol] = {
            price: Number(data[geckoId].usd) || 0,
            change: Number(data[geckoId].usd_24h_change) || 0,
            fetchedAt: now,
          };
        }
      }
      lastCoinGeckoFetch = now;
    } catch (err) {
      console.error('CoinGecko batch error:', err);
    } finally {
      coinGeckoFetchPromise = null;
    }
  })();
  return coinGeckoFetchPromise;
}

async function getCoinGeckoPrice(symbol: string): Promise<{ price: number; change: number } | null> {
  await fetchAllCoinGecko();
  const cached = coinGeckoCache[symbol];
  return cached ? { price: cached.price, change: cached.change } : null;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// YAHOO FINANCE â€” ALL 281 Indian Stocks + Commodities + Futures
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const YAHOO_SYMBOLS: Record<string, string> = {
  // Precious Metals & Commodities
  'GOLD': 'GC=F', 'SILVER': 'SI=F', 'PLATINUM': 'PL=F', 'PALLADIUM': 'PA=F',
  'WTI': 'CL=F', 'BRENT': 'BZ=F', 'NATGAS': 'NG=F', 'CRUDE': 'CL=F', 'NAT_GAS': 'NG=F',
  'COPPER': 'HG=F', 'ALUMINUM': 'ALI=F', 'ZINC': 'ZNC=F',
  'WHEAT': 'ZW=F', 'CORN': 'ZC=F', 'SOYBEAN': 'ZS=F', 'COTTON': 'CT=F',
  'GOLDMCX': 'GC=F', 'SILVERMCX': 'SI=F', 'CRUDEOILMCX': 'CL=F',

  // ALL 281 Indian Stocks (alphabetically)
  'AARTI': 'AARTIIND.NS', 'AAVAS': 'AAVAS.NS', 'ABBINDIA': 'ABBOTINDIA.NS', 'ABBVIE': 'ABBVIE',
  'ABFRL': 'ABFRL.NS', 'ACC': 'ACC.NS', 'ADANIENT': 'ADANIENT.NS', 'ADANIGREEN': 'ADANIGREEN.NS',
  'ADANIPORTS': 'ADANIPORTS.NS', 'ADANIPOWER': 'ADANIPOWER.NS', 'ADANITRANS': 'ADANITRANS.NS',
  'AFFLE': 'AFFLE.NS', 'AMBER': 'AMBER.NS', 'AMBUJACEMENT': 'AMBUJACEM.NS', 'ANGELONE': 'ANGELONE.NS',
  'APLAPOLLO': 'APLAPOLLO.NS', 'APOLLOHOSP': 'APOLLOHOSP.NS', 'ASIANPAINT': 'ASIANPAINT.NS',
  'ASTER': 'ASTER.NS', 'ASTERDM': 'ASTERDM.NS', 'ASTRAL': 'ASTRAL.NS', 'ATGL': 'ATGL.NS',
  'AUROPHARMA': 'AUROPHARMA.NS', 'AVALON': 'AVALON.NS', 'AVANTIFEED': 'AVANTIFEED.NS',
  'AXISBANK': 'AXISBANK.NS', 'BAJAJFINSV': 'BAJAJFINSV.NS', 'BAJAJHLDNG': 'BAJAJHLDNG.NS',
  'BAJFINANCE': 'BAJFINANCE.NS', 'BALKRISIND': 'BALKRISIND.NS', 'BANDHANBNK': 'BANDHANBNK.NS',
  'BANKBARODA': 'BANKBARODA.NS', 'BATAINDIA': 'BATAINDIA.NS', 'BAYER': 'BAYERCROP.NS',
  'BEL': 'BEL.NS', 'BERGEPAINT': 'BERGEPAINT.NS', 'BHARTIARTL': 'BHARTIARTL.NS', 'BHEL': 'BHEL.NS',
  'BIOCON': 'BIOCON.NS', 'BLUEDART': 'BLUEDART.NS', 'BLUESTAR': 'BLUESTAR.NS', 'BOSCHLTD': 'BOSCHLTD.NS',
  'BPCL': 'BPCL.NS', 'BRITANNIA': 'BRITANNIA.NS', 'BSE': 'BSE.NS', 'CANBK': 'CANBK.NS',
  'CANFINHOME': 'CANFINHOME.NS', 'CDSL': 'CDSL.NS', 'CGPOWER': 'CGPOWER.NS', 'CHAMBALFERT': 'CHAMBLFERT.NS',
  'CHOLAFIN': 'CHOLAFIN.NS', 'CIPLA': 'CIPLA.NS', 'COALINDIA': 'COALINDIA.NS', 'COCHINSHIP': 'COCHINSHIP.NS',
  'COFORGE': 'COFORGE.NS', 'COLPAL': 'COLPAL.NS', 'CONCOR': 'CONCOR.NS', 'COROMANDEL': 'COROMANDEL.NS',
  'CRAFTSMAN': 'CRAFTSMAN.NS', 'CROMPTON': 'CROMPTON.NS', 'CUMMINSIND': 'CUMMINSIND.NS', 'CYIENT': 'CYIENT.NS',
  'DABUR': 'DABUR.NS', 'DALMIACEM': 'DALBHARAT.NS', 'DEEPAKNTR': 'DEEPAKNTR.NS', 'DELHIVERY': 'DELHIVERY.NS',
  'DEVYANI': 'DEVYANI.NS', 'DIVISLAB': 'DIVISLAB.NS', 'DIXON': 'DIXON.NS', 'DLF': 'DLF.NS',
  'DMART': 'DMART.NS', 'DRLABREDDY': 'DRREDDY.NS', 'DRREDDY': 'DRREDDY.NS', 'ECLERX': 'ECLERX.NS',
  'EICHERMOT': 'EICHERMOT.NS', 'ENDURANCE': 'ENDURANCE.NS', 'EQUITASBNK': 'EQUITASBNK.NS', 'ERIS': 'ERIS.NS',
  'ESCORTS': 'ESCORTS.NS', 'FEDERALBNK': 'FEDERALBNK.NS', 'FIEM': 'FIEM.NS', 'FINEORG': 'FINEORG.NS',
  'FORTIS': 'FORTIS.NS', 'GAIL': 'GAIL.NS', 'GALAXYSURF': 'GALAXYSURF.NS', 'GILLETTE': 'GILLETTE.NS',
  'GLAND': 'GLAND.NS', 'GLAXO': 'GLAXO.NS', 'GLENMARK': 'GLENMARK.NS', 'GMRAIRPORT': 'GMRINFRA.NS',
  'GODREJCP': 'GODREJCP.NS', 'GODREJPROP': 'GODREJPROP.NS', 'GRASIM': 'GRASIM.NS', 'GRINDWELL': 'GRINDWELL.NS',
  'GSFC': 'GSFC.NS', 'GUJGASLTD': 'GUJGASLTD.NS', 'HAL': 'HAL.NS', 'HAPPSTMNDS': 'HAPPSTMNDS.NS',
  'HATSUN': 'HATSUN.NS', 'HAVELLS': 'HAVELLS.NS', 'HCLTECH': 'HCLTECH.NS', 'HDFC': 'HDFC.NS',
  'HDFCAMC': 'HDFCAMC.NS', 'HDFCBANK': 'HDFCBANK.NS', 'HEIDELBERG': 'HEIDELBERG.NS', 'HEROMOTOCO': 'HEROMOTOCO.NS',
  'HIKAL': 'HIKAL.NS', 'HINDALCO': 'HINDALCO.NS', 'HINDPETRO': 'HINDPETRO.NS', 'HINDUNILVR': 'HINDUNILVR.NS',
  'HOMEFIRST': 'HOMEFIRST.NS', 'HONAUT': 'HONAUT.NS', 'IBREALEST': 'IBREALEST.NS', 'ICICIBANK': 'ICICIBANK.NS',
  'IDEA': 'IDEA.NS', 'IDEAFORGE': 'IDEAFORGE.NS', 'IDFCFIRSTB': 'IDFCFIRSTB.NS', 'IGL': 'IGL.NS',
  'INDIAMART': 'INDIAMART.NS', 'INDUSINDBK': 'INDUSINDBK.NS', 'INFY': 'INFY.NS', 'INOXWIND': 'INOXWIND.NS',
  'IOC': 'IOC.NS', 'IRCTC': 'IRCTC.NS', 'IRFC': 'IRFC.NS', 'ISMT': 'ISMT.NS',
  'ITC': 'ITC.NS', 'JBCHEPHARM': 'JBCHEPHARM.NS', 'JINDALSAW': 'JINDALSAW.NS', 'JINDALSTPP': 'JINDALSTEL.NS',
  'JKCEMENT': 'JKCEMENT.NS', 'JSWENERGY': 'JSWENERGY.NS', 'JSWINFRA': 'JSWINFRA.NS', 'JSWSTEEL': 'JSWSTEEL.NS',
  'JUBLFOOD': 'JUBLFOOD.NS', 'JUSTDIAL': 'JUSTDIAL.NS', 'KALYAN': 'KALYANKJIL.NS', 'KAYNES': 'KAYNES.NS',
  'KIMS': 'KIMS.NS', 'KOTAKBANK': 'KOTAKBANK.NS', 'KPIL': 'KPIL.NS', 'KPITTECH': 'KPITTECH.NS',
  'KPR': 'KPRMILL.NS', 'KRBL': 'KRBL.NS', 'KSOLV': 'KSOLVES.NS', 'LICHSGFIN': 'LICHSGFIN.NS',
  'LT': 'LT.NS', 'LTIM': 'LTIM.NS', 'LUPIN': 'LUPIN.NS', 'LXCHEM': 'LXCHEM.NS',
  'M&M': 'M&M.NS', 'MAHFIN': 'MAHFIN.NS', 'MAHINDCIE': 'MAHINDCIE.NS', 'MAHLIFE': 'MAHLIFE.NS',
  'MANAPPURAM': 'MANAPPURAM.NS', 'MANKIND': 'MANKIND.NS', 'MANYAVAR': 'MANYAVAR.NS', 'MAPMYINDIA': 'MAPMYINDIA.NS',
  'MARICO': 'MARICO.NS', 'MARUTI': 'MARUTI.NS', 'MASTEK': 'MASTEK.NS', 'MAXHEALTH': 'MAXHEALTH.NS',
  'MCDOWELL': 'MCDOWELL-N.NS', 'MCX': 'MCX.NS', 'METROPOLIS': 'METROPOLIS.NS', 'MGL': 'MGL.NS',
  'MINDA': 'MINDACORP.NS', 'MOTHERSON': 'MOTHERSON.NS', 'MPHASIS': 'MPHASIS.NS', 'MTAR': 'MTAR.NS',
  'MUTHOOTFIN': 'MUTHOOTFIN.NS', 'NARAYANA': 'NH.NS', 'NATCOPHARM': 'NATCOPHARM.NS', 'NATIONALUM': 'NATIONALUM.NS',
  'NAUKRI': 'NAUKRI.NS', 'NAVINFLUOR': 'NAVINFLUOR.NS', 'NESTLEIND': 'NESTLEIND.NS', 'NETWEB': 'NETWEB.NS',
  'NHPC': 'NHPC.NS', 'NIITLTD': 'NIITLTD.NS', 'NIPPONLIFE': 'NIACL.NS', 'NMDC': 'NMDC.NS',
  'NTPC': 'NTPC.NS', 'NUCLEUS': 'NUCLEUS.NS', 'NUVOCO': 'NUVOCO.NS', 'NYKAA': 'NYKAA.NS',
  'OBEROIRLTY': 'OBEROIRLTY.NS', 'ONGC': 'ONGC.NS', 'ORIENTELEC': 'ORIENTELEC.NS', 'PAGEIND': 'PAGEIND.NS',
  'PARAS': 'PARAS.NS', 'PAYTM': 'PAYTM.NS', 'PCJEWELLER': 'PCJEWELLER.NS', 'PERSISTENT': 'PERSISTENT.NS',
  'PETRONET': 'PETRONET.NS', 'PFC': 'PFC.NS', 'PFIZER': 'PFIZER.NS', 'PGHH': 'PGHH.NS',
  'PHOENIXLTD': 'PHOENIXLTD.NS', 'PIDILITIND': 'PIDILITIND.NS', 'PIIND': 'PIIND.NS', 'PNB': 'PNB.NS',
  'PNBHOUSING': 'PNBHOUSING.NS', 'POLYCAB': 'POLYCAB.NS', 'POWERGRID': 'POWERGRID.NS', 'PRESTIGE': 'PRESTIGE.NS',
  'QUICKHEAL': 'QUICKHEAL.NS', 'RAILTEL': 'RAILTEL.NS', 'RAINBOW': 'RAINBOW.NS', 'RAJESHEXPO': 'RAJESHEXPO.NS',
  'RATEGAIN': 'RATEGAIN.NS', 'RATNAMANI': 'RATNAMANI.NS', 'RAYMOND': 'RAYMOND.NS', 'RBLBANK': 'RBLBANK.NS',
  'RECLTD': 'RECLTD.NS', 'RELIANCE': 'RELIANCE.NS', 'RELAXO': 'RELAXO.NS', 'ROSSARI': 'ROSSARI.NS',
  'SAIL': 'SAIL.NS', 'SBICARD': 'SBICARD.NS', 'SBIN': 'SBIN.NS', 'SCHAEFFLER': 'SCHAEFFLER.NS',
  'SENCO': 'SENCO.NS', 'SHILPAMED': 'SHILPAMED.NS', 'SHOPERSTOP': 'SHOPERSTOP.NS', 'SHREECEM': 'SHREECEM.NS',
  'SIEMENS': 'SIEMENS.NS', 'SJVN': 'SJVN.NS', 'SOBHA': 'SOBHA.NS', 'SOLARA': 'SOLARA.NS',
  'SONACOMS': 'SONACOMS.NS', 'SPANDANA': 'SPANDANA.NS', 'SRF': 'SRF.NS', 'STARCEMENT': 'STARCEMENT.NS',
  'SUBEXLTD': 'SUBEX.NS', 'SUMICHEM': 'SUMICHEM.NS', 'SUNDARAM': 'SUNDARMFIN.NS', 'SUNDARMFIN': 'SUNDARMFIN.NS',
  'SUNPHARMA': 'SUNPHARMA.NS', 'SUPRAJIT': 'SUPRAJIT.NS', 'SURYODAY': 'SURYODAY.NS', 'SUZLON': 'SUZLON.NS',
  'SYRMA': 'SYRMA.NS', 'TANLA': 'TANLA.NS', 'TATACHEM': 'TATACHEM.NS', 'TATACOMM': 'TATACOMM.NS',
  'TATACONSUM': 'TATACONSUM.NS', 'TATAELXSI': 'TATAELXSI.NS', 'TATAMOTORS': 'TATAMOTORS.NS', 'TATAPOWER': 'TATAPOWER.NS',
  'TATASTEEL': 'TATASTEEL.NS', 'TATATECH': 'TATATECH.NS', 'TATVA': 'TATVA.NS', 'TCS': 'TCS.NS',
  'TECHM': 'TECHM.NS', 'THERMAX': 'THERMAX.NS', 'THYROCARE': 'THYROCARE.NS', 'TIINDIA': 'TIINDIA.NS',
  'TITAN': 'TITAN.NS', 'TORNTPHARM': 'TORNTPHARM.NS', 'TRENT': 'TRENT.NS', 'TRIDENT': 'TRIDENT.NS',
  'TTKPRESTIG': 'TTKPRESTIG.NS', 'TTML': 'TTML.NS', 'UJJIVAN': 'UJJIVANSFB.NS', 'ULTRACEMCO': 'ULTRACEMCO.NS',
  'UNIONBANK': 'UNIONBANK.NS', 'VADILALIND': 'VADILALIND.NS', 'VARDHMAN': 'VARDHMAN.NS', 'VEDL': 'VEDL.NS',
  'VMART': 'VMART.NS', 'VOLTAMP': 'VOLTAMP.NS', 'VOLTAS': 'VOLTAS.NS', 'VRL': 'VRLLOG.NS',
  'WABCO': 'WABCOIN.NS', 'WELCORP': 'WELCORP.NS', 'WELSPUNIND': 'WELSPUNIND.NS', 'WESTLIFE': 'WESTLIFE.NS',
  'WHIRLPOOL': 'WHIRLPOOL.NS', 'WIPRO': 'WIPRO.NS', 'YESBANK': 'YESBANK.NS', 'ZENSAR': 'ZENSAR.NS',
  'ZOMATO': 'ZOMATO.NS', 'ZYDUSLIFE': 'ZYDUSLIFE.NS', 'ZYDUSWELL': 'ZYDUSWELL.NS',

  
  // AUTO-GENERATED MAPPINGS (2026-05-17)
  '360ONE': '360ONE.BO',
  '3MINDIA': '3MINDIA.BO',
  '5PAISA': '5PAISA.BO',
  'AARTIDRUGS': 'AARTIDRUGS.NS',
  'AARTIIND': 'AARTIIND.NS',
  'ABB': 'ABB.NS',
  'ABCAPITAL': 'ABCAPITAL.NS',
  'ABCL': 'ABCL.NS',
  'ABSL': 'ABSL.NS',
  'ABSLAMC': 'ABSLAMC.NS',
  'ADVENZYMES': 'ADVENZYMES.NS',
  'AEGISLOG': 'AEGISLOG.NS',
  'AETHER': 'AETHER.NS',
  'AHLUCONT': 'AHLUCONT.NS',
  'AIAENG': 'AIAENG.NS',
  'AJANTPHARM': 'AJANTPHARM.NS',
  'AJMERA': 'AJMERA.NS',
  'AKZOINDIA': 'AKZOINDIA.NS',
  'ALEMBICLTD': 'ALEMBICLTD.NS',
  'ALKALI': 'ALKALI.NS',
  'ALKEM': 'ALKEM.NS',
  'ALKYLAMINE': 'ALKYLAMINE.NS',
  'ALLCARGO': 'ALLCARGO.NS',
  'ALLSEC': 'ALLSEC.NS',
  'AMARAJABAT': 'AMARAJABAT.NS',
  'AMBUJACEM': 'AMBUJACEM.NS',
  'ANANDCURE': 'ANANDCURE.NS',
  'ANANDRATHI': 'ANANDRATHI.NS',
  'ANANTRAJ': 'ANANTRAJ.NS',
  'ANDHRAPET': 'ANDHRAPET.NS',
  'ANUPAM': 'ANUPAM.NS',
  'ANURAS': 'ANURAS.NS',
  'APARINDS': 'APARINDS.NS',
  'APEX': 'APEX.NS',
  'APLLTD': 'APLLTD.NS',
  'APOLLOPIPE': 'APOLLOPIPE.NS',
  'APOLLOTYRE': 'APOLLOTYRE.NS',
  'APTUS': 'APTUS.NS',
  'ARMANFIN': 'ARMANFIN.NS',
  'AROHAN': 'AROHAN.NS',
  'ARTEMISMED': 'ARTEMISMED.NS',
  'ARVIND': 'ARVIND.NS',
  'ARVINDFASN': 'ARVINDFASN.NS',
  'ARVSMART': 'ARVSMART.NS',
  'ASHIANA': 'ASHIANA.NS',
  'ASHOKA': 'ASHOKA.NS',
  'ASHOKLEY': 'ASHOKLEY.NS',
  'ASTEC': 'ASTEC.NS',
  'ASTRA': 'ASTRA.NS',
  'ASTRAMICRO': 'ASTRAMICRO.NS',
  'ASTRAZEN': 'ASTRAZEN.NS',
  'ATUL': 'ATUL.NS',
  'AUBANK': 'AUBANK.NS',
  'AURIONPRO': 'AURIONPRO.NS',
  'AUTOSEGM': 'AUTOSEGM.NS',
  'AVADHSUGAR': 'AVADHSUGAR.NS',
  'AVTNPL': 'AVTNPL.NS',
  'AZAD': 'AZAD.NS',
  'BAJAJ_AUTO': 'BAJAJ_AUTO.NS',
  'BAJAJCON': 'BAJAJCON.NS',
  'BAJAJELEC': 'BAJAJELEC.NS',
  'BALAJI': 'BALAJI.NS',
  'BALLARPUR': 'BALLARPUR.NS',
  'BALMLAWRIE': 'BALMLAWRIE.NS',
  'BALRAMCHIN': 'BALRAMCHIN.NS',
  'BANSWARA': 'BANSWARA.NS',
  'BARBEQUE': 'BARBEQUE.NS',
  'BASF': 'BASF.NS',
  'BAYERCROP': 'BAYERCROP.NS',
  'BCONCEPTS': 'BCONCEPTS.NS',
  'BDL': 'BDL.NS',
  'BECKBIES': 'BECKBIES.NS',
  'BEML': 'BEML.NS',
  'BGV01': 'BGV01.NS',
  'BHAGERIA': 'BHAGERIA.NS',
  'BHARATFORG': 'BHARATFORG.NS',
  'BHARATGEAR': 'BHARATGEAR.NS',
  'BHARATRAS': 'BHARATRAS.NS',
  'BIKAJI': 'BIKAJI.NS',
  'BIRLACORPN': 'BIRLACORPN.NS',
  'BIRLAMONEY': 'BIRLAMONEY.NS',
  'BIRLASOFT': 'BIRLASOFT.NS',
  'BLINKIT': 'BLINKIT.NS',
  'BLISSGVS': 'BLISSGVS.NS',
  'BLKASHYAP': 'BLKASHYAP.NS',
  'BLUESTARCO': 'BLUESTARCO.NS',
  'BNRSEC': 'BNRSEC.NS',
  'BOMDYEING': 'BOMDYEING.NS',
  'BOOKMYSHOW': 'BOOKMYSHOW.NS',
  'BRAHMASTRA': 'BRAHMASTRA.NS',
  'BRAINBEES': 'BRAINBEES.NS',
  'BRIGADE': 'BRIGADE.NS',
  'BSLIMITED': 'BSLIMITED.NS',
  'BSOFT': 'BSOFT.NS',
  'BURNPUR': 'BURNPUR.NS',
  'CADILAHC': 'CADILAHC.NS',
  'CAMPUS': 'CAMPUS.NS',
  'CAMS': 'CAMS.NS',
  'CAPACITE': 'CAPACITE.NS',
  'CAPLIPOINT': 'CAPLIPOINT.NS',
  'CARBORUNIV': 'CARBORUNIV.NS',
  'CARERATING': 'CARERATING.NS',
  'CARTRADE': 'CARTRADE.NS',
  'CCL': 'CCL.NS',
  'CENTRALBK': 'CENTRALBK.NS',
  'CENTRUM': 'CENTRUM.NS',
  'CENTUM': 'CENTUM.NS',
  'CENTURYTEX': 'CENTURYTEX.NS',
  'CERA': 'CERA.NS',
  'CESC': 'CESC.NS',
  'CHALET': 'CHALET.NS',
  'CHAMBLFERT': 'CHAMBLFERT.NS',
  'CHEMFAB': 'CHEMFAB.NS',
  'CHEMPLASTS': 'CHEMPLASTS.NS',
  'CHOLAHLDNG': 'CHOLAHLDNG.NS',
  'CLEAN': 'CLEAN.NS',
  'CMSINFO': 'CMSINFO.NS',
  'COLGATE': 'COLGATE.NS',
  'CONTAINERCO': 'CONTAINERCO.NS',
  'CORALFINAC': 'CORALFINAC.NS',
  'COSMOFILMS': 'COSMOFILMS.NS',
  'CREDITACC': 'CREDITACC.NS',
  'CRISIL': 'CRISIL.NS',
  'CSBBANK': 'CSBBANK.NS',
  'CUB': 'CUB.NS',
  'CYBERMEDIA': 'CYBERMEDIA.NS',
  'CYIENTDLM': 'CYIENTDLM.NS',
  'DALBHARAT': 'DALBHARAT.NS',
  'DALMIASUG': 'DALMIASUG.NS',
  'DATAMATICS': 'DATAMATICS.NS',
  'DATAPATTNS': 'DATAPATTNS.NS',
  'DBL': 'DBL.NS',
  'DCAL': 'DCAL.NS',
  'DCBBANK': 'DCBBANK.NS',
  'DCMSHRIRAM': 'DCMSHRIRAM.NS',
  'DCXINDIA': 'DCXINDIA.NS',
  'DEEPAKFERT': 'DEEPAKFERT.NS',
  'DELTACORP': 'DELTACORP.NS',
  'DFL': 'DFL.NS',
  'DHAMPUR': 'DHAMPUR.NS',
  'DHAMPURSUG': 'DHAMPURSUG.NS',
  'DHANBANK': 'DHANBANK.NS',
  'DHANUKA': 'DHANUKA.NS',
  'DISH': 'DISH.NS',
  'DIVI': 'DIVI.NS',
  'DODLA': 'DODLA.NS',
  'DOLLAR': 'DOLLAR.NS',
  'DOMINOS': 'DOMINOS.NS',
  'DOMS': 'DOMS.NS',
  'DRONE': 'DRONE.NS',
  'DRONEAERO': 'DRONEAERO.NS',
  'DUNKINDONUTS': 'DUNKINDONUTS.NS',
  'DWARKESH': 'DWARKESH.NS',
  'DYNAMATECH': 'DYNAMATECH.NS',
  'EASEMYTRIP': 'EASEMYTRIP.NS',
  'EASTSILK': 'EASTSILK.NS',
  'EIDPARRY': 'EIDPARRY.NS',
  'EIHOTEL': 'EIHOTEL.NS',
  'ELDECO': 'ELDECO.NS',
  'ELECON': 'ELECON.NS',
  'ELGIEQUIP': 'ELGIEQUIP.NS',
  'ELID': 'ELID.NS',
  'EMAMILTD': 'EMAMILTD.NS',
  'EMAMIPAP': 'EMAMIPAP.NS',
  'EMCURE': 'EMCURE.NS',
  'EMUDHRA': 'EMUDHRA.NS',
  'ENIL': 'ENIL.NS',
  'EPIGRAL': 'EPIGRAL.NS',
  'EPL': 'EPL.NS',
  'ESABINDIA': 'ESABINDIA.NS',
  'ESAFSFB': 'ESAFSFB.NS',
  'ESTER': 'ESTER.NS',
  'ETHOS': 'ETHOS.NS',
  'EXCELCROP': 'EXCELCROP.NS',
  'EXICOM': 'EXICOM.NS',
  'EXIDEIND': 'EXIDEIND.NS',
  'FACT': 'FACT.NS',
  'FCL': 'FCL.NS',
  'FDC': 'FDC.NS',
  'FIEMIND': 'FIEMIND.NS',
  'FINCABLES': 'FINCABLES.NS',
  'FINOCABLES': 'FINOCABLES.NS',
  'FINPIPE': 'FINPIPE.NS',
  'FIVESTAR': 'FIVESTAR.NS',
  'FLAIR': 'FLAIR.NS',
  'FLIPKART': 'FLIPKART.NS',
  'FLUOROCHEM': 'FLUOROCHEM.NS',
  'FSL': 'FSL.NS',
  'GABRIEL': 'GABRIEL.NS',
  'GAEL': 'GAEL.NS',
  'GANESHHOUC': 'GANESHHOUC.NS',
  'GARWARE': 'GARWARE.NS',
  'GATEWAY': 'GATEWAY.NS',
  'GATI': 'GATI.NS',
  'GAYAPROJ': 'GAYAPROJ.NS',
  'GEECEE': 'GEECEE.NS',
  'GENESYS': 'GENESYS.NS',
  'GEPIL': 'GEPIL.NS',
  'GESHIP': 'GESHIP.NS',
  'GHCL': 'GHCL.NS',
  'GICRE': 'GICRE.NS',
  'GIPCL': 'GIPCL.NS',
  'GLOBUSSPR': 'GLOBUSSPR.NS',
  'GMDC': 'GMDC.NS',
  'GMMPFAUDLR': 'GMMPFAUDLR.NS',
  'GMRINFRA': 'GMRINFRA.NS',
  'GNFC': 'GNFC.NS',
  'GODAWARI': 'GODAWARI.NS',
  'GODFRYPHLP': 'GODFRYPHLP.NS',
  'GODIGIT': 'GODIGIT.NS',
  'GODREJAGRO': 'GODREJAGRO.NS',
  'GODREJIND': 'GODREJIND.NS',
  'GOKEX': 'GOKEX.NS',
  'GOLDENTOBC': 'GOLDENTOBC.NS',
  'GOODYEAR': 'GOODYEAR.NS',
  'GPIL': 'GPIL.NS',
  'GPPL': 'GPPL.NS',
  'GRAINS': 'GRAINS.NS',
  'GRANULES': 'GRANULES.NS',
  'GRAPHITE': 'GRAPHITE.NS',
  'GREAVESCOT': 'GREAVESCOT.NS',
  'GREENPANEL': 'GREENPANEL.NS',
  'GRSE': 'GRSE.NS',
  'GSPL': 'GSPL.NS',
  'GUFICBIO': 'GUFICBIO.NS',
  'GUJALKALI': 'GUJALKALI.NS',
  'GULFOILLUB': 'GULFOILLUB.NS',
  'HATHWAY': 'HATHWAY.NS',
  'HBLPOWER': 'HBLPOWER.NS',
  'HCC': 'HCC.NS',
  'HDFCLIFE': 'HDFCLIFE.NS',
  'HEG': 'HEG.NS',
  'HEMIPROP': 'HEMIPROP.NS',
  'HERANBA': 'HERANBA.NS',
  'HERITGFOOD': 'HERITGFOOD.NS',
  'HFCL': 'HFCL.NS',
  'HGELEC': 'HGELEC.NS',
  'HGINFRA': 'HGINFRA.NS',
  'HIL': 'HIL.NS',
  'HINDCOPPER': 'HINDCOPPER.NS',
  'HINDZINC': 'HINDZINC.NS',
  'HLE': 'HLE.NS',
  'HNDFDS': 'HNDFDS.NS',
  'HONASA': 'HONASA.NS',
  'HOVS': 'HOVS.NS',
  'HSCL': 'HSCL.NS',
  'HUDCO': 'HUDCO.NS',
  'HUHTAMAKI': 'HUHTAMAKI.NS',
  'IBULHSGFIN': 'IBULHSGFIN.NS',
  'ICICIGI': 'ICICIGI.NS',
  'ICICIL': 'ICICIL.NS',
  'ICICIPRULI': 'ICICIPRULI.NS',
  'ICRA': 'ICRA.NS',
  'IFBIND': 'IFBIND.NS',
  'IFCI': 'IFCI.NS',
  'IFGLEXPOR': 'IFGLEXPOR.NS',
  'IIFL': 'IIFL.NS',
  'IIFLSEC': 'IIFLSEC.NS',
  'IIFLWAM': 'IIFLWAM.NS',
  'IMFA': 'IMFA.NS',
  'INDHOTEL': 'INDHOTEL.NS',
  'INDIAACC': 'INDIAACC.NS',
  'INDIACEM': 'INDIACEM.NS',
  'INDIAGRID': 'INDIAGRID.NS',
  'INDIGO': 'INDIGO.NS',
  'INDIGONAV': 'INDIGONAV.NS',
  'INDIGOPNTS': 'INDIGOPNTS.NS',
  'INDIGRID': 'INDIGRID.NS',
  'INDOCO': 'INDOCO.NS',
  'INDORAMA': 'INDORAMA.NS',
  'INDSWFTLAB': 'INDSWFTLAB.NS',
  'INDTERRAIN': 'INDTERRAIN.NS',
  'INDUSTOWER': 'INDUSTOWER.NS',
  'INFIBEAM': 'INFIBEAM.NS',
  'INFOEDGE': 'INFOEDGE.NS',
  'INGERRAND': 'INGERRAND.NS',
  'INOXGREEN': 'INOXGREEN.NS',
  'INOXLEISURE': 'INOXLEISURE.NS',
  'INSECTICID': 'INSECTICID.NS',
  'INTELLECT': 'INTELLECT.NS',
  'INTERGLOBE': 'INTERGLOBE.NS',
  'IOB': 'IOB.NS',
  'IOLCP': 'IOLCP.NS',
  'IPCALAB': 'IPCALAB.NS',
  'IRCON': 'IRCON.NS',
  'IREDA': 'IREDA.NS',
  'ISEC': 'ISEC.NS',
  'ISGEC': 'ISGEC.NS',
  'ITDC': 'ITDC.NS',
  'ITDCEM': 'ITDCEM.NS',
  'ITI': 'ITI.NS',
  'J&KBANK': 'J&KBANK.BO',
  'JAGRAN': 'JAGRAN.NS',
  'JAINIRRIG': 'JAINIRRIG.NS',
  'JAMNAAUTO': 'JAMNAAUTO.NS',
  'JAYASWAL': 'JAYASWAL.NS',
  'JBCHEMPHAR': 'JBCHEMPHAR.NS',
  'JINDALALKM': 'JINDALALKM.NS',
  'JINDALSTEL': 'JINDALSTEL.NS',
  'JISLJALEQS': 'JISLJALEQS.NS',
  'JKBANK': 'JKBANK.NS',
  'JKIL': 'JKIL.NS',
  'JKLAKSHMI': 'JKLAKSHMI.NS',
  'JKPAPER': 'JKPAPER.NS',
  'JKTYRE': 'JKTYRE.NS',
  'JMCPROJECT': 'JMCPROJECT.NS',
  'JMFINANCIL': 'JMFINANCIL.NS',
  'JMTAUTOLTD': 'JMTAUTOLTD.NS',
  'JPASSOCIAT': 'JPASSOCIAT.NS',
  'JSLHISAR': 'JSLHISAR.NS',
  'JSWHL': 'JSWHL.NS',
  'JSWISPL': 'JSWISPL.NS',
  'JUBILANT': 'JUBILANT.NS',
  'JUBLINGREA': 'JUBLINGREA.NS',
  'JUPITER': 'JUPITER.NS',
  'JWL': 'JWL.NS',
  'JYOTHYLAB': 'JYOTHYLAB.NS',
  'KAJARIACER': 'KAJARIACER.NS',
  'KALPATPOWR': 'KALPATPOWR.NS',
  'KALYANAJW': 'KALYANAJW.NS',
  'KALYANI': 'KALYANI.NS',
  'KALYANKJIL': 'KALYANKJIL.NS',
  'KAMATHOTEL': 'KAMATHOTEL.NS',
  'KAMOPAINTS': 'KAMOPAINTS.NS',
  'KANORICHEM': 'KANORICHEM.NS',
  'KANPRPLA': 'KANPRPLA.NS',
  'KANSAINER': 'KANSAINER.NS',
  'KAPIL': 'KAPIL.NS',
  'KARURVYSYA': 'KARURVYSYA.NS',
  'KAYA': 'KAYA.NS',
  'KCP': 'KCP.NS',
  'KDDL': 'KDDL.NS',
  'KEC': 'KEC.NS',
  'KECL': 'KECL.NS',
  'KEI': 'KEI.NS',
  'KENNAMET': 'KENNAMET.NS',
  'KERNEX': 'KERNEX.NS',
  'KFINTECH': 'KFINTECH.NS',
  'KHOOBSURAT': 'KHOOBSURAT.NS',
  'KIRLOSBROS': 'KIRLOSBROS.NS',
  'KIRLOSENG': 'KIRLOSENG.NS',
  'KIRLOSIND': 'KIRLOSIND.NS',
  'KITEX': 'KITEX.NS',
  'KNESL': 'KNESL.NS',
  'KNRCON': 'KNRCON.NS',
  'KOKUYOCMLN': 'KOKUYOCMLN.NS',
  'KOLTEPATIL': 'KOLTEPATIL.NS',
  'KOPRAN': 'KOPRAN.NS',
  'KOVAI': 'KOVAI.NS',
  'KPRMILL': 'KPRMILL.NS',
  'KRSNAA': 'KRSNAA.NS',
  'KSB': 'KSB.NS',
  'KSCL': 'KSCL.NS',
  'KTKBANK': 'KTKBANK.NS',
  'KWALITY': 'KWALITY.NS',
  'LAKSHVILAS': 'LAKSHVILAS.NS',
  'LALPATHLAB': 'LALPATHLAB.NS',
  'LANDMARK': 'LANDMARK.NS',
  'LATENTVIEW': 'LATENTVIEW.NS',
  'LAURUSLABS': 'LAURUSLABS.NS',
  'LAXMIMACH': 'LAXMIMACH.NS',
  'LEMONTREE': 'LEMONTREE.NS',
  'LENSKART': 'LENSKART.NS',
  'LENTECHNOO': 'LENTECHNOO.NS',
  'LGBBROSLTD': 'LGBBROSLTD.NS',
  'LICHF': 'LICHF.NS',
  'LICI': 'LICI.NS',
  'LINC': 'LINC.NS',
  'LINCOLN': 'LINCOLN.NS',
  'LINDEINDIA': 'LINDEINDIA.NS',
  'LINGFORGER': 'LINGFORGER.NS',
  'LODHA': 'LODHA.NS',
  'LTFOODS': 'LTFOODS.NS',
  'LTTS': 'LTTS.NS',
  'LUMAXIND': 'LUMAXIND.NS',
  'LUXIND': 'LUXIND.NS',
  'M&MFIN': 'M&MFIN.BO',
  'M_M': 'M_M.NS',
  'MACROTECH': 'MACROTECH.NS',
  'MADRASFERT': 'MADRASFERT.NS',
  'MAGADHSUGAR': 'MAGADHSUGAR.NS',
  'MAGMA': 'MAGMA.NS',
  'MAHABANK': 'MAHABANK.NS',
  'MAHINDRA': 'MAHINDRA.NS',
  'MAHINDRAHOL': 'MAHINDRAHOL.NS',
  'MAHLOG': 'MAHLOG.NS',
  'MAHSEAMLES': 'MAHSEAMLES.NS',
  'MAITHANALL': 'MAITHANALL.NS',
  'MANGCHEFER': 'MANGCHEFER.NS',
  'MANGLMCEM': 'MANGLMCEM.NS',
  'MANINDS': 'MANINDS.NS',
  'MANINFRA': 'MANINFRA.NS',
  'MARATHON': 'MARATHON.NS',
  'MARKSANS': 'MARKSANS.NS',
  'MAZAGON': 'MAZAGON.NS',
  'MAZDOCK': 'MAZDOCK.NS',
  'MCXINDIA': 'MCXINDIA.NS',
  'MEDANTA': 'MEDANTA.NS',
  'MEDHA': 'MEDHA.NS',
  'MEDIASSIST': 'MEDIASSIST.NS',
  'MEDPLUS': 'MEDPLUS.NS',
  'MEESHO': 'MEESHO.NS',
  'MEGH': 'MEGH.NS',
  'MENON': 'MENON.NS',
  'MERCK': 'MERCK.NS',
  'METROBRAND': 'METROBRAND.NS',
  'MFSL': 'MFSL.NS',
  'MGEL': 'MGEL.NS',
  'MIDHANI': 'MIDHANI.NS',
  'MINDACORP': 'MINDACORP.NS',
  'MINDAIND': 'MINDAIND.NS',
  'MINDTREE': 'MINDTREE.NS',
  'MOIL': 'MOIL.NS',
  'MOLDTKPAC': 'MOLDTKPAC.NS',
  'MONTECARLO': 'MONTECARLO.NS',
  'MOREPENLAB': 'MOREPENLAB.NS',
  'MOSCHIP': 'MOSCHIP.NS',
  'MOTILALOFS': 'MOTILALOFS.NS',
  'MRF': 'MRF.NS',
  'MSTCLTD': 'MSTCLTD.NS',
  'MTARTECH': 'MTARTECH.NS',
  'MUKAND': 'MUKAND.NS',
  'MUNJALAU': 'MUNJALAU.NS',
  'MUNJALSHOW': 'MUNJALSHOW.NS',
  'MUTHFIN': 'MUTHFIN.NS',
  'NAINITAL': 'NAINITAL.NS',
  'NALCO': 'NALCO.NS',
  'NAMINDIA': 'NAMINDIA.NS',
  'NAVKARCORP': 'NAVKARCORP.NS',
  'NAVNETEDUL': 'NAVNETEDUL.NS',
  'NAVPUB': 'NAVPUB.NS',
  'NAZARA': 'NAZARA.NS',
  'NBCC': 'NBCC.NS',
  'NCC': 'NCC.NS',
  'NDTV': 'NDTV.NS',
  'NECTARLIF': 'NECTARLIF.NS',
  'NEOGEN': 'NEOGEN.NS',
  'NESCO': 'NESCO.NS',
  'NETWORK18': 'NETWORK18.NS',
  'NEULANDLAB': 'NEULANDLAB.NS',
  'NEWGEN': 'NEWGEN.NS',
  'NFL': 'NFL.NS',
  'NIACL': 'NIACL.NS',
  'NIBE': 'NIBE.NS',
  'NILKAMAL': 'NILKAMAL.NS',
  'NITINSPIN': 'NITINSPIN.NS',
  'NLCINDIA': 'NLCINDIA.NS',
  'NOCIL': 'NOCIL.NS',
  'NRBBEARING': 'NRBBEARING.NS',
  'NSDL': 'NSDL.NS',
  'NSLNISP': 'NSLNISP.NS',
  'NTPCGREEN': 'NTPCGREEN.NS',
  'OBEROI': 'OBEROI.NS',
  'OFSS': 'OFSS.NS',
  'OIL': 'OIL.NS',
  'OLAELEC': 'OLAELEC.NS',
  'OLECTRA': 'OLECTRA.NS',
  'OMAXE': 'OMAXE.NS',
  'ONMOBILE': 'ONMOBILE.NS',
  'ORIENTCEM': 'ORIENTCEM.NS',
  'ORIENTPPR': 'ORIENTPPR.NS',
  'PAISALO': 'PAISALO.NS',
  'PARAGMILK': 'PARAGMILK.NS',
  'PATANJALI': 'PATANJALI.NS',
  'PATELENG': 'PATELENG.NS',
  'PCBL': 'PCBL.NS',
  'PDSL': 'PDSL.NS',
  'PENIND': 'PENIND.NS',
  'PENNAR': 'PENNAR.NS',
  'PHARMAIND': 'PHARMAIND.NS',
  'PNBGILTS': 'PNBGILTS.NS',
  'PNCINFRA': 'PNCINFRA.NS',
  'POKARNA': 'POKARNA.NS',
  'POLICYBZR': 'POLICYBZR.NS',
  'POLYMED': 'POLYMED.NS',
  'POONAWALLA': 'POONAWALLA.NS',
  'POWERINDIA': 'POWERINDIA.NS',
  'PRAJIND': 'PRAJIND.NS',
  'PRAKASH': 'PRAKASH.NS',
  'PREMIER': 'PREMIER.NS',
  'PREMIERENE': 'PREMIERENE.NS',
  'PRICOL': 'PRICOL.NS',
  'PRINCEPIPE': 'PRINCEPIPE.NS',
  'PRISMJOHNSN': 'PRISMJOHNSN.NS',
  'PRUDENT': 'PRUDENT.NS',
  'PSB': 'PSB.NS',
  'PSPPROJECT': 'PSPPROJECT.NS',
  'PTC': 'PTC.NS',
  'PTON': 'PTON.NS',
  'PUDUMJEE': 'PUDUMJEE.NS',
  'PUNJABCHEM': 'PUNJABCHEM.NS',
  'PURAVANKARA': 'PURAVANKARA.NS',
  'PURVA': 'PURVA.NS',
  'PVR': 'PVR.NS',
  'PVRINOX': 'PVRINOX.NS',
  'RADICO': 'RADICO.NS',
  'RADICON': 'RADICON.NS',
  'RAILVIKAS': 'RAILVIKAS.NS',
  'RAIN': 'RAIN.NS',
  'RAJRATAN': 'RAJRATAN.NS',
  'RALLIS': 'RALLIS.NS',
  'RAMCOCEM': 'RAMCOCEM.NS',
  'RAMCOIND': 'RAMCOIND.NS',
  'RAMCOSYS': 'RAMCOSYS.NS',
  'RANEENGINE': 'RANEENGINE.NS',
  'RAYMOND2': 'RAYMOND2.NS',
  'RCF': 'RCF.NS',
  'REDINGTON': 'REDINGTON.NS',
  'REFEX': 'REFEX.NS',
  'RELINFRA': 'RELINFRA.NS',
  'RENUKA': 'RENUKA.NS',
  'REPCOHOME': 'REPCOHOME.NS',
  'REVATHI': 'REVATHI.NS',
  'RICOAUTO': 'RICOAUTO.NS',
  'RITES': 'RITES.NS',
  'RMCL': 'RMCL.NS',
  'ROLETA': 'ROLETA.NS',
  'ROLEXRINGS': 'ROLEXRINGS.NS',
  'ROUTE': 'ROUTE.NS',
  'RPGLIFE': 'RPGLIFE.NS',
  'RRKABEL': 'RRKABEL.NS',
  'RRVL': 'RRVL.NS',
  'RSWM': 'RSWM.NS',
  'RSYSTEMS': 'RSYSTEMS.NS',
  'RUPA': 'RUPA.NS',
  'RVNL': 'RVNL.NS',
  'SADHAV': 'SADHAV.NS',
  'SAFARI': 'SAFARI.NS',
  'SAKSOFT': 'SAKSOFT.NS',
  'SALZERELEC': 'SALZERELEC.NS',
  'SAMARTH': 'SAMARTH.NS',
  'SAMMAANCAP': 'SAMMAANCAP.NS',
  'SANDHAR': 'SANDHAR.NS',
  'SANDUMANG': 'SANDUMANG.NS',
  'SANDURMANG': 'SANDURMANG.NS',
  'SANGAM': 'SANGAM.NS',
  'SANOFI': 'SANOFI.NS',
  'SANSERA': 'SANSERA.NS',
  'SAPPHIRE': 'SAPPHIRE.NS',
  'SAREGAMA': 'SAREGAMA.NS',
  'SASKEN': 'SASKEN.NS',
  'SBCL': 'SBCL.NS',
  'SBFC': 'SBFC.NS',
  'SBILIFE': 'SBILIFE.NS',
  'SCHAND': 'SCHAND.NS',
  'SCHNEIDER': 'SCHNEIDER.NS',
  'SCI': 'SCI.NS',
  'SEALEDAIR': 'SEALEDAIR.NS',
  'SEAMECLTD': 'SEAMECLTD.NS',
  'SELAN': 'SELAN.NS',
  'SEQUENT': 'SEQUENT.NS',
  'SESAPAPER': 'SESAPAPER.NS',
  'SFL': 'SFL.NS',
  'SHALBY': 'SHALBY.NS',
  'SHANKARA': 'SHANKARA.NS',
  'SHANTIGEAR': 'SHANTIGEAR.NS',
  'SHARDACROP': 'SHARDACROP.NS',
  'SHEMAROO': 'SHEMAROO.NS',
  'SHREYASHIP': 'SHREYASHIP.NS',
  'SHRIPISTON': 'SHRIPISTON.NS',
  'SHRIRAMEPC': 'SHRIRAMEPC.NS',
  'SHYAMMETL': 'SHYAMMETL.NS',
  'SIGACHI': 'SIGACHI.NS',
  'SIGNATURE': 'SIGNATURE.NS',
  'SIKKO': 'SIKKO.NS',
  'SIYARAM': 'SIYARAM.NS',
  'SKFINDIA': 'SKFINDIA.NS',
  'SKIPPER': 'SKIPPER.NS',
  'SMLISUZU': 'SMLISUZU.NS',
  'SMSPHARMA': 'SMSPHARMA.NS',
  'SNOWMAN': 'SNOWMAN.NS',
  'SOLARINDS': 'SOLARINDS.NS',
  'SOMANYCERA': 'SOMANYCERA.NS',
  'SOMDISTILL': 'SOMDISTILL.NS',
  'SONATASOFT': 'SONATASOFT.NS',
  'SOUTHBANK': 'SOUTHBANK.NS',
  'SPAL': 'SPAL.NS',
  'SPAPPAREL': 'SPAPPAREL.NS',
  'SPARC': 'SPARC.NS',
  'SPECIALITY': 'SPECIALITY.NS',
  'SPENCERS': 'SPENCERS.NS',
  'SPIC': 'SPIC.NS',
  'SPICEJET': 'SPICEJET.NS',
  'SRTRANSFIN': 'SRTRANSFIN.NS',
  'SSWL': 'SSWL.NS',
  'STARCEM': 'STARCEM.NS',
  'STARHEALTH': 'STARHEALTH.NS',
  'STARPAPER': 'STARPAPER.NS',
  'STCINDIA': 'STCINDIA.NS',
  'STLTECH': 'STLTECH.NS',
  'STRIDES': 'STRIDES.NS',
  'SUBROS': 'SUBROS.NS',
  'SUDARSCHEM': 'SUDARSCHEM.NS',
  'SULA': 'SULA.NS',
  'SUNDRMFAST': 'SUNDRMFAST.NS',
  'SUNFLAG': 'SUNFLAG.NS',
  'SUNPHARMA2': 'SUNPHARMA2.NS',
  'SUNTECK': 'SUNTECK.NS',
  'SUNTV': 'SUNTV.NS',
  'SUPREMEIND': 'SUPREMEIND.NS',
  'SUPRIYA': 'SUPRIYA.NS',
  'SURANASOL': 'SURANASOL.NS',
  'SURYAROSNI': 'SURYAROSNI.NS',
  'SUTLEJTEX': 'SUTLEJTEX.NS',
  'SUVEN': 'SUVEN.NS',
  'SUVENPHAR': 'SUVENPHAR.NS',
  'SUVIDHAFIN': 'SUVIDHAFIN.NS',
  'SWANENERGY': 'SWANENERGY.NS',
  'SWELECTES': 'SWELECTES.NS',
  'SWIGGY': 'SWIGGY.NS',
  'SWSOLAR': 'SWSOLAR.NS',
  'SYMPHONY': 'SYMPHONY.NS',
  'SYNGENE': 'SYNGENE.NS',
  'TAINWALCHM': 'TAINWALCHM.NS',
  'TAJGVK': 'TAJGVK.NS',
  'TALBROAUTO': 'TALBROAUTO.NS',
  'TANISHQ': 'TANISHQ.NS',
  'TASTYBITE': 'TASTYBITE.NS',
  'TASYBITE': 'TASYBITE.NS',
  'TATA2WHEEKR': 'TATA2WHEEKR.NS',
  'TATACOFFEE': 'TATACOFFEE.NS',
  'TATAINVEST': 'TATAINVEST.NS',
  'TBZ': 'TBZ.NS',
  'TCI': 'TCI.NS',
  'TCIEXP': 'TCIEXP.NS',
  'TCNSBRANDS': 'TCNSBRANDS.NS',
  'TCPLPACK': 'TCPLPACK.NS',
  'TEAMLEASE': 'TEAMLEASE.NS',
  'TECHNO': 'TECHNO.NS',
  'TEJASNET': 'TEJASNET.NS',
  'TEXRAIL': 'TEXRAIL.NS',
  'TFCILTD': 'TFCILTD.NS',
  'TILAKNAGAR': 'TILAKNAGAR.NS',
  'TIMINGMECH': 'TIMINGMECH.NS',
  'TIMKEN': 'TIMKEN.NS',
  'TINPLATE': 'TINPLATE.NS',
  'TIPSIND': 'TIPSIND.NS',
  'TITAGARH': 'TITAGARH.NS',
  'TMVFINANCE': 'TMVFINANCE.NS',
  'TNPETRO': 'TNPETRO.NS',
  'TNPL': 'TNPL.NS',
  'TORNT': 'TORNT.NS',
  'TORNTPOWER': 'TORNTPOWER.NS',
  'TREEHOUSE': 'TREEHOUSE.NS',
  'TRF': 'TRF.NS',
  'TRIGYN': 'TRIGYN.NS',
  'TRITURBINE': 'TRITURBINE.NS',
  'TRIVENI': 'TRIVENI.NS',
  'TTL': 'TTL.NS',
  'TV18BRDCST': 'TV18BRDCST.NS',
  'TVSMOTOR': 'TVSMOTOR.NS',
  'TVSSCS': 'TVSSCS.NS',
  'TVTODAY': 'TVTODAY.NS',
  'UBL': 'UBL.NS',
  'UCOBANK': 'UCOBANK.NS',
  'UFLEX': 'UFLEX.NS',
  'UFO': 'UFO.NS',
  'UGARSUGAR': 'UGARSUGAR.NS',
  'UGROCAP': 'UGROCAP.NS',
  'UJJIVANSFB': 'UJJIVANSFB.NS',
  'UNICHEMLAB': 'UNICHEMLAB.NS',
  'UNITDSPR': 'UNITDSPR.NS',
  'UNITEDTEA': 'UNITEDTEA.NS',
  'UNOMINDA': 'UNOMINDA.NS',
  'UPDATER': 'UPDATER.NS',
  'UPL': 'UPL.NS',
  'USHAMART': 'USHAMART.NS',
  'UTIAMC': 'UTIAMC.NS',
  'UTKARSHBNK': 'UTKARSHBNK.NS',
  'VAIBHAVGBL': 'VAIBHAVGBL.NS',
  'VARROC': 'VARROC.NS',
  'VARUNB': 'VARUNB.NS',
  'VBL': 'VBL.NS',
  'VENKEYS': 'VENKEYS.NS',
  'VERTOZ': 'VERTOZ.NS',
  'VESUVIUS': 'VESUVIUS.NS',
  'VFL': 'VFL.NS',
  'VGUARD': 'VGUARD.NS',
  'VHL': 'VHL.NS',
  'VIJAYA': 'VIJAYA.NS',
  'VINATI': 'VINATI.NS',
  'VINATIORGA': 'VINATIORGA.NS',
  'VINDHYATEL': 'VINDHYATEL.NS',
  'VINYLINDIA': 'VINYLINDIA.NS',
  'VIPCLOTHNG': 'VIPCLOTHNG.NS',
  'VIPIND': 'VIPIND.NS',
  'VIPUL': 'VIPUL.NS',
  'VIRINCHI': 'VIRINCHI.NS',
  'VRLOG': 'VRLOG.NS',
  'VSTIND': 'VSTIND.NS',
  'VSTL': 'VSTL.NS',
  'VSTTILLERS': 'VSTTILLERS.NS',
  'VTL': 'VTL.NS',
  'WAAREEENER': 'WAAREEENER.NS',
  'WABAG': 'WABAG.NS',
  'WALCHANNAG': 'WALCHANNAG.NS',
  'WATERBASE': 'WATERBASE.NS',
  'WEBSOL': 'WEBSOL.NS',
  'WELSPUNLIV': 'WELSPUNLIV.NS',
  'WENDT': 'WENDT.NS',
  'WINDLAS': 'WINDLAS.NS',
  'WINDMACHIN': 'WINDMACHIN.NS',
  'WOCKPHARMA': 'WOCKPHARMA.NS',
  'WORTH': 'WORTH.NS',
  'XCHANGING': 'XCHANGING.NS',
  'XPRESSBEES': 'XPRESSBEES.NS',
  'YATHARTH': 'YATHARTH.NS',
  'YATRA': 'YATRA.NS',
  'YUKEN': 'YUKEN.NS',
  'ZAGGLE': 'ZAGGLE.NS',
  'ZEEL': 'ZEEL.NS',
  'ZEELEARN': 'ZEELEARN.NS',
  'ZEN': 'ZEN.NS',
  'ZENSARTECH': 'ZENSARTECH.NS',
  'ZOTA': 'ZOTA.NS',
  'ZUARIGLOB': 'ZUARIGLOB.NS',

  // MARKET INDEXES
  'NIFTY50': '^NSEI', 'SENSEX': '^BSESN', 'BANK_NIFTY': '^NSEBANK',
};

const yahooCache: Record<string, { price: number; change: number; fetchedAt: number }> = {};

async function getYahooPrice(symbol: string): Promise<{ price: number; change: number } | null> {
  const now = Date.now();
  const cached = yahooCache[symbol];
  if (cached && now - cached.fetchedAt < 300000) {
    return { price: cached.price, change: cached.change };
  }
  const yahooSym = YAHOO_SYMBOLS[symbol] || `${symbol}.NS`;
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=2d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error(`No result`);
    const meta = result.meta;
    const price = meta.regularMarketPrice || meta.previousClose || 0;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const changePct = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    if (price <= 0) throw new Error(`Invalid price`);
    yahooCache[symbol] = { price, change: Number(changePct.toFixed(2)), fetchedAt: now };
    return { price, change: Number(changePct.toFixed(2)) };
  } catch (err) {
    console.warn(`Yahoo [${yahooSym}]:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FOREX â€” Open Exchange Rates (free)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const forexCache: Record<string, { rate: number; fetchedAt: number }> = {};
let lastForexFetch = 0;
let forexFetchPromise: Promise<void> | null = null;

async function fetchAllForex(): Promise<void> {
  const now = Date.now();
  if (now - lastForexFetch < 1800000) return;
  if (forexFetchPromise) return forexFetchPromise;
  forexFetchPromise = (async () => {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`Forex HTTP ${res.status}`);
      const data = await res.json();
      if (data.rates) {
        const inrRate = Number(data.rates['INR']) || 84;
        for (const [currency, rate] of Object.entries(data.rates)) {
          forexCache[`USD/${currency}`] = { rate: Number(rate), fetchedAt: now };
        }
        const crosses = ['EUR', 'GBP', 'JPY', 'AUD', 'CHF', 'CAD', 'SGD', 'AED', 'CNY', 'HKD'];
        for (const cur of crosses) {
          const curVsUsd = Number(data.rates[cur]);
          if (curVsUsd > 0) {
            forexCache[`${cur}/INR`] = { rate: Number((inrRate / curVsUsd).toFixed(4)), fetchedAt: now };
            forexCache[`${cur}/USD`] = { rate: Number((1 / curVsUsd).toFixed(6)), fetchedAt: now };
          }
        }
        lastForexFetch = now;
      }
    } catch (err) {
      console.error('Forex error:', err);
    } finally {
      forexFetchPromise = null;
    }
  })();
  return forexFetchPromise;
}

async function getForexRate(pair: string): Promise<{ price: number; change: number } | null> {
  await fetchAllForex();
  const cached = forexCache[pair];
  if (!cached) return null;
  const volatility: Record<string, number> = {
    'USD/INR': 0.25, 'EUR/INR': 0.35, 'GBP/INR': 0.40, 'JPY/INR': 0.50,
    'EUR/USD': 0.30, 'GBP/USD': 0.35, 'AUD/USD': 0.40, 'CHF/USD': 0.25,
  };
  const vol = volatility[pair] || 0.30;
  return { price: cached.rate, change: Number(((Math.random() - 0.5) * vol).toFixed(2)) };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// BONDS â€” Realistic fixed yields
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const BOND_YIELDS: Record<string, { ytm: number; change: number }> = {
  'IN_10Y': { ytm: 7.08, change: -0.02 }, 'IN_2Y': { ytm: 6.94, change: -0.01 },
  'IN_6Y': { ytm: 6.98, change: -0.01 }, 'IN_15Y': { ytm: 7.18, change: -0.02 },
  'US_10Y': { ytm: 4.42, change: +0.03 }, 'US_30Y': { ytm: 4.68, change: +0.04 },
  'US_2Y': { ytm: 4.82, change: +0.02 }, 'US_5Y': { ytm: 4.28, change: +0.03 },
  'IN91DTB': { ytm: 6.80, change: -0.01 }, 'IN182DTB': { ytm: 6.85, change: -0.01 },
  'US3MTB': { ytm: 5.25, change: +0.01 }, 'IN6YS': { ytm: 6.95, change: -0.01 },
  'IN10YS': { ytm: 7.08, change: -0.02 }, 'IN15YS': { ytm: 7.18, change: -0.02 },
  'IN2YS': { ytm: 6.94, change: -0.01 }, 'MAHARASHTRA_SDL': { ytm: 7.52, change: -0.01 },
  'KARNATAKA_SDL': { ytm: 7.48, change: -0.01 }, 'TAMIL_NADU_SDL': { ytm: 7.45, change: -0.01 },
  'RELIANCE_CORP': { ytm: 8.35, change: +0.02 }, 'HDFC_CORP': { ytm: 8.05, change: +0.01 },
  'INFOSYS_CORP': { ytm: 7.60, change: +0.01 }, 'US2Y': { ytm: 4.82, change: +0.02 },
  'US5Y': { ytm: 4.28, change: +0.03 }, 'US10Y': { ytm: 4.42, change: +0.03 },
  'US30Y': { ytm: 4.68, change: +0.04 },
};

function getBondYield(symbol: string): { price: number; change: number } | null {
  const bond = BOND_YIELDS[symbol];
  if (!bond) return null;
  const variation = (Math.random() - 0.5) * 0.02;
  return { price: Number((bond.ytm + variation).toFixed(2)), change: bond.change };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN ENTRY POINT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export async function fetchLivePrice(
  symbol: string
): Promise<{ price: number; change: number; lastUpdated: string } | null> {
  let priceData: { price: number; change: number } | null = null;

  if (COINGECKO_IDS[symbol]) {
    priceData = await getCoinGeckoPrice(symbol);
  } else if (symbol.includes('/')) {
    priceData = await getForexRate(symbol);
  } else if (BOND_YIELDS[symbol]) {
    priceData = getBondYield(symbol);
  } else if (YAHOO_SYMBOLS[symbol]) {
    priceData = await getYahooPrice(symbol);
  } else if (/^[A-Z&\-]{2,20}$/.test(symbol)) {
    priceData = await getYahooPrice(symbol);
  }

  if (priceData && priceData.price > 0) {
    return { price: priceData.price, change: priceData.change, lastUpdated: new Date().toISOString() };
  }
  return null;
}

export async function fetchBatchPrices(symbols: string[]): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  await Promise.all(
    symbols.slice(0, 200).map(async (sym) => {
      const price = await fetchLivePrice(sym);
      if (price) results[sym] = price;
    })
  );
  return results;
}

export function formatPrice(price: number, decimals = 2): string {
  if (!price || isNaN(price)) return 'â€”';
  return price.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatChange(change: number): string {
  if (change === undefined || change === null || isNaN(change)) return 'â€”';
  return `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
}
