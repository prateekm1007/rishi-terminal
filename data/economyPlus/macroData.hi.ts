// data/economyPlus/macroData.hi.ts
// हिंदी अनुवाद - जनवरी 2025
// सभी मान भारतीय मैक्रो स्थितियों के यथार्थवादी अनुमान हैं

export interface MacroIndicator {
  label: string;
  value: string;
  unit: string;
  trend: 'up' | 'down' | 'flat';
  trendValue: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
  asOf: string;
}

export interface PhilosopherStance {
  philosopher: 'Hayek' | 'Friedman' | 'Keynes';
  emoji: string;
  color: string;
  shortBio: string;
  currentStance: string;
  stanceColor: 'bullish' | 'bearish' | 'neutral' | 'cautious';
  regimeView: string;
  keyWarning: string;
  keyConcernTag?: string;
  sectorImplications?: string[];
  agreement: number;
  indicators: {
    label: string;
    view: string;
    signal: 'positive' | 'negative' | 'neutral';
  }[];
}

export interface MacroRegime {
  label: string;
  sublabel: string;
  color: string;
  description: string;
  historicalAnalog: string;
  analogPeriod: string;
  implications: string[];
}

export interface CurrencyData {
  pair: string;
  rate: number;
  change: number;
  changePct: number;
  trend: 'strengthening' | 'weakening' | 'stable';
  volatility: 'low' | 'medium' | 'high';
  signal: string;
}

// ── वर्तमान मैक्रो व्यवस्था ────────────────────────────────────────────────
export const MACRO_REGIME: MacroRegime = {
  label: 'उत्तर-चक्र ऋण विस्तार',
  sublabel: 'मुद्रास्फीति धाराएं · राजकोषीय दबाव · चुनिंदा विकास',
  color: '#F59E0B',
  description: 'भारत एक उत्तर-चक्र विस्तार चरण में है — GDP वृद्धि मजबूत है लेकिन निजी ऋण के बजाय सरकारी पूंजीगत व्यय द्वारा संचालित है। मुद्रास्फीति शिखर से कम हुई है लेकिन खाद्य और सेवाओं में चिपचिपी बनी हुई है। RBI दरों को रोके हुए है जबकि वैश्विक केंद्रीय बैंक अलग हो रहे हैं।',
  historicalAnalog: '2007 भारत पूर्व-GFC विस्तार',
  analogPeriod: '2006–2008',
  implications: [
    'गुणवत्ता और पूंजी-हल्के व्यवसाय चक्रीयों से बेहतर प्रदर्शन करते हैं',
    'दर-संवेदनशील क्षेत्रों को लंबे समय तक उच्च दरों से चुनौतियों का सामना',
    'वैश्विक डॉलर ताकत से INR अवमूल्यन दबाव',
    'बुनियादी ढांचा और घरेलू खपत लचीला रहता है',
    'निर्यात-उन्मुख IT को मुद्रा और मांग अनिश्चितता का सामना',
  ],
};

// ── मैक्रो संकेतक ──────────────────────────────────────────────────────────
export const MACRO_INDICATORS: MacroIndicator[] = [
  {
    label: 'CPI मुद्रास्फीति',
    value: '5.22',
    unit: '%',
    trend: 'down',
    trendValue: 'पिछले महीने से -0.48%',
    signal: 'neutral',
    description: 'उपभोक्ता मूल्य सूचकांक — मुख्य मुद्रास्फीति 7.4% शिखर से नीचे की ओर लेकिन खाद्य मुद्रास्फीति 8.7% पर उच्च बनी हुई है।',
    asOf: 'दिसंबर 2024',
  },
  {
    label: 'कोर CPI',
    value: '3.65',
    unit: '%',
    trend: 'down',
    trendValue: '-0.12% MoM',
    signal: 'bullish',
    description: 'खाद्य और ईंधन को छोड़कर। कोर मुद्रास्फीति RBI आराम क्षेत्र के करीब — अंतर्निहित मांग अधिक गरम नहीं हो रही।',
    asOf: 'दिसंबर 2024',
  },
  {
    label: 'WPI मुद्रास्फीति',
    value: '2.37',
    unit: '%',
    trend: 'up',
    trendValue: 'नवंबर से +0.21%',
    signal: 'neutral',
    description: 'थोक मूल्य सूचकांक — निर्मित वस्तुओं के कारण बढ़ रहा है। 2-3 महीनों में संभावित CPI दबाव का प्रारंभिक संकेत।',
    asOf: 'दिसंबर 2024',
  },
  {
    label: 'RBI रेपो दर',
    value: '6.50',
    unit: '%',
    trend: 'flat',
    trendValue: 'अपरिवर्तित — 6 बैठकें',
    signal: 'neutral',
    description: 'RBI विस्तारित विराम पर। बाजार H1 2025 में 1-2 कटौती की कीमत लगा रहा है यदि CPI स्थायी रूप से 4.5% से नीचे गिरता है।',
    asOf: 'जनवरी 2025',
  },
  {
    label: '10Y G-Sec उपज',
    value: '6.78',
    unit: '%',
    trend: 'down',
    trendValue: '30 दिनों में -18bps',
    signal: 'bullish',
    description: 'उपज नरम हो रही है दर कटौती की प्रत्याशा में। बॉन्ड बाजार RBI का नेतृत्व कर रहा है। रेपो पर स्प्रेड 28bps पर — ऐतिहासिक रूप से संकीर्ण।',
    asOf: 'जनवरी 2025',
  },
  {
    label: 'GDP वृद्धि',
    value: '6.4',
    unit: '% YoY',
    trend: 'down',
    trendValue: 'पिछले वर्ष 7.6% बनाम',
    signal: 'neutral',
    description: 'वृद्धि मध्यम हो रही है लेकिन वैश्विक स्तर पर सबसे अधिक में बनी हुई है। धीमी निजी पूंजीगत व्यय और निर्यात कमजोरी से मंदी। सरकारी पूंजीगत व्यय ऑफसेट कर रहा है।',
    asOf: 'Q2 FY25',
  },
  {
    label: 'M3 मुद्रा आपूर्ति',
    value: '11.2',
    unit: '% YoY',
    trend: 'up',
    trendValue: 'Q2 से +0.8%',
    signal: 'neutral',
    description: 'व्यापक मुद्रा वृद्धि पुनः त्वरित हो रही है। नाममात्र GDP वृद्धि से ऊपर — मध्यम मुद्रीकरण संकेत। Friedman इसे चिह्नित करेगा।',
    asOf: 'दिसंबर 2024',
  },
  {
    label: 'सरकारी ऋण / GDP',
    value: '84.0',
    unit: '%',
    trend: 'up',
    trendValue: 'FY23 से +2.1%',
    signal: 'bearish',
    description: 'संयुक्त केंद्र + राज्य ऋण बढ़ रहा है। ब्याज भार सरकारी राजस्व का 25%+ उपभोग कर रहा है। राजकोषीय समेकन प्रगति धीमी हो रही है।',
    asOf: 'FY24',
  },
  {
    label: 'चालू खाता',
    value: '-1.2',
    unit: '% GDP का',
    trend: 'up',
    trendValue: '-2.0% से सुधार',
    signal: 'bullish',
    description: 'सॉफ्टवेयर निर्यात और प्रेषण पर CAD तेजी से संकुचित हो रहा है। आरामदायक सीमा — INR कमजोरी को कम करता है।',
    asOf: 'Q2 FY25',
  },
  {
    label: 'विदेशी मुद्रा भंडार',
    value: '624',
    unit: 'USD अरब',
    trend: 'down',
    trendValue: 'शिखर से -$18 अरब',
    signal: 'neutral',
    description: 'RBI भंडार को INR अस्थिरता को सुचारू करने के लिए तैनात कर रहा है। अभी भी ~11 महीने के आयात को कवर करता है — आरामदायक बफर।',
    asOf: 'जनवरी 2025',
  },
];

// ── दार्शनिक रुख ──────────────────────────────────────────────────────────
export const PHILOSOPHER_STANCES: PhilosopherStance[] = [
  {
    philosopher: 'Hayek',
    emoji: '🏛️',
    color: '#818CF8',
    shortBio: 'ऑस्ट्रियन स्कूल · स्वतःस्फूर्त व्यवस्था · हस्तक्षेप-विरोधी',
    currentStance: 'सावधान',
    stanceColor: 'cautious',
    regimeView: 'गलत निवेश चक्र निर्माण। सरकारी पूंजीगत व्यय पूंजी संरचना को विकृत कर रहा है। निजी क्षेत्र भीड़भाड़ में। तेजी कृत्रिम रूप से लंबी — 2025 के बाद मंदी जोखिम बढ़ रहा है।',
    keyWarning: 'राजकोषीय विस्तार झूठे संकेत बनाता है। बुनियादी ढांचा उछाल दर-संवेदनशील क्षेत्रों में गलत आवंटन को छिपा सकता है। 18-24 महीनों में ऋण गुणवत्ता बिगड़ने को देखें।',
    keyConcernTag: 'गलत निवेश जोखिम',
    sectorImplications: [
      'कमजोर बैलेंस शीट के साथ लंबी अवधि के बुनियादी ढांचा खेलों से बचें',
      'लीवरेज्ड चक्रीय पर नकदी-उत्पन्न करने वाली गुणवत्ता को प्राथमिकता दें',
      'उत्तर-चक्र ऋण तनाव के लिए NBFC/रियल्टी देखें',
      'सब्सिडी-निर्भर व्यवसाय मॉडल पर संदेह करें',
    ],
    agreement: 28,
    indicators: [
      { label: 'सरकारी पूंजीगत व्यय-संचालित वृद्धि', view: 'कृत्रिम उछाल — टिकाऊ जैविक वृद्धि नहीं', signal: 'negative' },
      { label: 'RBI दर विराम', view: 'दरें अभी भी प्राकृतिक दर से नीचे — गलत निवेश बना रहता है', signal: 'negative' },
      { label: 'M3 पुनः त्वरण', view: 'उत्पादक क्षमता से परे ऋण विस्तार', signal: 'negative' },
      { label: 'गिरता कोर CPI', view: 'अस्थायी — मौद्रिक विकृतियां फिर से उभरेंगी', signal: 'neutral' },
      { label: 'CAD सुधार', view: 'केवल सकारात्मक संकेत — व्यापार अनुशासन सुधर रहा है', signal: 'positive' },
    ],
  },
  {
    philosopher: 'Friedman',
    emoji: '📊',
    color: '#34D399',
    shortBio: 'शिकागो स्कूल · मुद्रावाद · नियम-आधारित नीति',
    currentStance: 'तटस्थ',
    stanceColor: 'neutral',
    regimeView: 'M3 वृद्धि 11.2% पर नाममात्र GDP से अधिक है — पाइपलाइन में मध्यम मुद्रास्फीति दबाव। RBI नीति उपयुक्त है लेकिन स्पष्ट नाममात्र GDP नियम के लिए प्रतिबद्ध होनी चाहिए। M3 सामान्य होने तक दर कटौती समय से पहले।',
    keyWarning: 'मौद्रिक नीति लंबे और परिवर्तनशील अंतराल के साथ कार्य करती है। 2022-23 कड़ेपन के प्रभाव अभी भी खुल रहे हैं। M3 वृद्धि 9% से नीचे लगातार गिरने तक दरों में कटौती न करें।',
    keyConcernTag: 'मुद्रा आपूर्ति और अंतराल प्रभाव',
    sectorImplications: [
      'यदि मुद्रास्फीति फिर से तेज होती है तो मूल्य-शक्ति व्यवसायों का पक्ष लें',
      'कटौती वास्तविक होने तक दर-संवेदनशील खपत पर सावधान रहें',
      'यदि मुद्रास्फीति निहित रहती है और वृद्धि धारण करती है तो वित्तीय लाभ',
      'मौद्रिक संचरण अंतराल को नजरअंदाज करने वाली कथाओं से बचें',
    ],
    agreement: 52,
    indicators: [
      { label: 'M3 11.2% YoY पर', view: 'नाममात्र GDP वृद्धि से ऊपर — सावधानी से देखें', signal: 'negative' },
      { label: 'CPI 5.22% पर', view: 'सही दिशा में रुझान — अभी तक जीत नहीं', signal: 'neutral' },
      { label: 'रेपो दर 6.5%', view: 'उपयुक्त — समय से पहले कटौती न करें', signal: 'positive' },
      { label: 'कोर CPI 3.65%', view: 'प्रोत्साहक — मौद्रिक संचरण काम कर रहा है', signal: 'positive' },
      { label: 'राजकोषीय घाटा', view: 'मौद्रिक स्वतंत्रता के लिए राजकोषीय प्रभुत्व जोखिम', signal: 'negative' },
    ],
  },
  {
    philosopher: 'Keynes',
    emoji: '⚙️',
    color: '#FB923C',
    shortBio: 'कैम्ब्रिज स्कूल · समग्र मांग · राजकोषीय प्रोत्साहन',
    currentStance: 'तेजी',
    stanceColor: 'bullish',
    regimeView: 'सरकारी पूंजीगत व्यय बिल्कुल सही दवा है। पशु आत्माओं को पोषण की आवश्यकता है — निजी क्षेत्र सार्वजनिक निवेश का अनुसरण करेगा। RBI को खपत बढ़ाने और निजी पूंजीगत व्यय को भीड़ में लाने के लिए अभी दरों में कटौती करनी चाहिए।',
    keyWarning: 'जोखिम बहुत कम करना है, बहुत अधिक नहीं। GDP का 7.6% से 6.4% तक धीमा होना प्रारंभिक चेतावनी है। 50bps की पूर्व-रोकथाम दर कटौती + निरंतर राजकोषीय खर्च निजी निवेश को फिर से प्रज्वलित करेगा।',
    keyConcernTag: 'मांग समर्थन',
    sectorImplications: [
      'घरेलू मांग प्रॉक्सी (बैंक, उपभोक्ता, बुनियादी ढांचा) अधिक वजन',
      'दर कटौती उच्च गुणवत्ता वृद्धि और आवास-जुड़े खेलों को फिर से रेट करेगी',
      'विश्वास संकेतक देखें; पशु आत्माएं गति चलाती हैं',
      'निर्यात गौण हैं; घरेलू गुणक प्राथमिक है',
    ],
    agreement: 74,
    indicators: [
      { label: 'GDP 6.4% पर', view: 'मंदी के लिए काउंटर-चक्रीय प्रतिक्रिया की आवश्यकता', signal: 'negative' },
      { label: 'सरकारी पूंजीगत व्यय', view: 'गुणक प्रभाव काम कर रहा है — जारी रखना चाहिए', signal: 'positive' },
      { label: 'RBI विराम', view: '50bps की दर कटौती अतिदेय — मांग को समर्थन की आवश्यकता', signal: 'negative' },
      { label: 'ऋण/GDP 84%', view: 'वर्तमान वृद्धि दरों पर टिकाऊ — चिंताजनक नहीं', signal: 'neutral' },
      { label: 'FII प्रवाह सकारात्मक', view: 'भारत कहानी में वैश्विक विश्वास बरकरार', signal: 'positive' },
    ],
  },
];

// ── मुद्रा डेटा ────────────────────────────────────────────────────────────
export const CURRENCY_DATA: CurrencyData[] = [
  { pair: 'USD/INR', rate: 84.28, change: 0.42, changePct: 0.50, trend: 'weakening', volatility: 'medium', signal: 'डॉलर ताकत से INR पर हल्का दबाव। RBI 84-85 सीमा की रक्षा कर रहा है।' },
  { pair: 'EUR/INR', rate: 87.14, change: -0.18, changePct: -0.21, trend: 'stable', volatility: 'low', signal: 'EUR कमजोरी आंशिक रूप से INR पर डॉलर दबाव को ऑफसेट कर रही है।' },
  { pair: 'GBP/INR', rate: 106.82, change: 0.28, changePct: 0.26, trend: 'weakening', volatility: 'medium', signal: 'UK मैक्रो आश्चर्य द्वारा संचालित GBP ताकत — मध्यम INR प्रभाव।' },
  { pair: 'JPY/INR', rate: 0.5421, change: -0.008, changePct: -1.46, trend: 'strengthening', volatility: 'high', signal: 'येन कैरी अनविंड जोखिम — अचानक JPY स्पाइक EM प्रवाह को प्रभावित करने के लिए देखें।' },
];

// ── दार्शनिक सर्वसम्मति गणना ───────────────────────────────────────────────
export function getPhilosopherConsensus(): {
  avgAgreement: number;
  spread: number;
  label: string;
  color: string;
  description: string;
} {
  const agreements = PHILOSOPHER_STANCES.map(p => p.agreement);
  const avg = Math.round(agreements.reduce((a, b) => a + b, 0) / agreements.length);
  const spread = Math.max(...agreements) - Math.min(...agreements);

  let label: string;
  let color: string;
  let description: string;

  if (spread < 15) {
    label = 'मजबूत सर्वसम्मति';
    color = '#10B981';
    description = 'तीनों अर्थशास्त्री मैक्रो दृष्टिकोण पर व्यापक रूप से सहमत हैं।';
  } else if (spread < 30) {
    label = 'हल्की असहमति';
    color = '#34D399';
    description = 'मामूली दार्शनिक अंतर — मुख्य दृष्टिकोण संरेखित।';
  } else if (spread < 50) {
    label = 'मध्यम विभाजन';
    color = '#F59E0B';
    description = 'निदान और नुस्खे में सार्थक अंतर।';
  } else if (spread < 65) {
    label = 'तीव्र असहमति';
    color = '#F97316';
    description = 'नीति दिशा पर मौलिक दार्शनिक संघर्ष।';
  } else {
    label = 'अ‌समाधानयोग्य संघर्ष';
    color = '#EF4444';
    description = 'व्यास विपरीत विचार — व्यवस्था एक विभक्ति बिंदु पर है।';
  }

  return { avgAgreement: avg, spread, label, color, description };
}

// ── सेक्टर रोटेशन दृष्टिकोण ──────────────────────────────────────────────────
export interface SectorRotationEntry {
  sector: string;
  icon: string;
  hayek:    { score: number; stance: string; rationale: string };
  friedman: { score: number; stance: string; rationale: string };
  keynes:   { score: number; stance: string; rationale: string };
  consensus: number;
  spread:    number;
  regimeOutlook: '3M' | '6M' | '12M';
  forwardBias: string;
  biasColor: string;
  keyMacroDriver: string;
}

export const SECTOR_ROTATION: SectorRotationEntry[] = [
  {
    sector: 'बैंकिंग',
    icon: '🏦',
    hayek:    { score: 62, stance: 'तटस्थ',    rationale: 'ऋण विस्तार स्वस्थ यदि वास्तविक बचत द्वारा समर्थित। NPA प्रक्षेपवक्र देखें।' },
    friedman: { score: 72, stance: 'जमा करें', rationale: 'दर विराम NIM स्थिरता में मदद करता है। मुद्रीकरण जोखिम निहित है।' },
    keynes:   { score: 80, stance: 'मजबूत खरीद', rationale: 'मांग प्रोत्साहन का लंगर। दर कटौती ऋण और मार्जिन को बढ़ावा देगी।' },
    consensus: 71, spread: 18,
    regimeOutlook: '6M', forwardBias: 'जमा करें', biasColor: '#10B981',
    keyMacroDriver: 'रेपो दर प्रक्षेपवक्र + ऋण वृद्धि',
  },
  {
    sector: 'IT',
    icon: '💻',
    hayek:    { score: 70, stance: 'जमा करें', rationale: 'पूंजी-हल्का, कोई ऋण नहीं, उच्च FCF — Hayekian आदर्श। वैश्विक मांग अनिश्चितता जोखिम है।' },
    friedman: { score: 58, stance: 'तटस्थ',    rationale: 'डॉलर ताकत राजस्व में मदद करती है लेकिन US मंदी चिंताएं बनी रहती हैं।' },
    keynes:   { score: 44, stance: 'कम करें',     rationale: 'निर्यात-उन्मुख; घरेलू गुणक IT को सीधे मदद नहीं करता।' },
    consensus: 57, spread: 26,
    regimeOutlook: '6M', forwardBias: 'तटस्थ', biasColor: '#F59E0B',
    keyMacroDriver: 'USD/INR + US एंटरप्राइज IT खर्च',
  },
  {
    sector: 'फार्मा',
    icon: '💊',
    hayek:    { score: 75, stance: 'जमा करें', rationale: 'मूल्य निर्धारण शक्ति + निर्यात आय + न्यूनतम सरकारी निर्भरता।' },
    friedman: { score: 68, stance: 'जमा करें', rationale: 'मुद्रास्फीति-प्रतिरोधी राजस्व। डॉलर आय INR कमजोरी हेज।' },
    keynes:   { score: 60, stance: 'तटस्थ',    rationale: 'घरेलू मांग स्थिर लेकिन प्रोत्साहन का प्रत्यक्ष लाभार्थी नहीं।' },
    consensus: 68, spread: 15,
    regimeOutlook: '6M', forwardBias: 'जमा करें', biasColor: '#10B981',
    keyMacroDriver: 'USD/INR + US FDA अनुमोदन + घरेलू फॉर्मूलेशन',
  },
  {
    sector: 'ऑटो',
    icon: '🚗',
    hayek:    { score: 52, stance: 'तटस्थ',    rationale: 'उपभोक्ता ऋण-संचालित चक्र। ऑटो ऋण में ऋण गुणवत्ता देखें।' },
    friedman: { score: 60, stance: 'तटस्थ',    rationale: 'दर कटौती EMI-संचालित मांग में मदद करेगी; कीमत लगाने के लिए समय से पहले।' },
    keynes:   { score: 82, stance: 'मजबूत खरीद', rationale: 'पशु आत्माओं चालक। दर कटौती + ग्रामीण मांग पुनरुद्धार = पुनर्मूल्यांकन।' },
    consensus: 65, spread: 30,
    regimeOutlook: '6M', forwardBias: 'जमा करें', biasColor: '#10B981',
    keyMacroDriver: 'दर कटौती + ग्रामीण आय + EV नीति',
  },
  {
    sector: 'FMCG',
    icon: '🛒',
    hayek:    { score: 68, stance: 'जमा करें', rationale: 'मूल्य निर्धारण शक्ति और ब्रांड खाई — सभी व्यवस्थाओं में लचीला।' },
    friedman: { score: 72, stance: 'जमा करें', rationale: 'कम मुद्रास्फीति पर्यावरण मात्रा वसूली में मदद करता है। रक्षात्मक।' },
    keynes:   { score: 55, stance: 'तटस्थ',    rationale: 'ग्रामीण मांग सुधर रही है लेकिन शहरी विवेकाधीन खर्च मौन।' },
    consensus: 65, spread: 17,
    regimeOutlook: '3M', forwardBias: 'तटस्थ', biasColor: '#F59E0B',
    keyMacroDriver: 'ग्रामीण मजदूरी वृद्धि + खाद्य मुद्रास्फीति प्रक्षेपवक्र',
  },
  {
    sector: 'बुनियादी ढांचा',
    icon: '🏗️',
    hayek:    { score: 28, stance: 'बचें',      rationale: 'सरकारी पूंजीगत व्यय निर्भरता = गलत निवेश जोखिम। लंबी गर्भावस्था, निष्पादन जोखिम।' },
    friedman: { score: 55, stance: 'तटस्थ',    rationale: 'उत्पादक पूंजीगत व्यय ठीक है लेकिन राजकोषीय भीड़-बाहर चिंता है।' },
    keynes:   { score: 90, stance: 'मजबूत खरीद', rationale: 'गुणक यहां है। सरकारी पूंजीगत व्यय का हर रुपया 2-3x डाउनस्ट्रीम उत्पन्न करता है।' },
    consensus: 58, spread: 62,
    regimeOutlook: '12M', forwardBias: 'तटस्थ', biasColor: '#F59E0B',
    keyMacroDriver: 'बजट पूंजीगत व्यय आवंटन + ऑर्डर बुक दृश्यता',
  },
  {
    sector: 'रियल्टी',
    icon: '🏢',
    hayek:    { score: 22, stance: 'बचें',      rationale: 'क्लासिक गलत निवेश क्षेत्र। ऋण-संचालित उछाल वास्तविक मांग को छिपाता है।' },
    friedman: { score: 48, stance: 'कम करें',     rationale: 'दर-संवेदनशील। अभी तक कोई कटौती नहीं = खरीदारों पर मार्जिन दबाव।' },
    keynes:   { score: 75, stance: 'जमा करें', rationale: 'आवास मांग वास्तविक है। दर कटौती उत्प्रेरक रियल्टी के लिए शक्तिशाली है।' },
    consensus: 48, spread: 53,
    regimeOutlook: '6M', forwardBias: 'तटस्थ', biasColor: '#F59E0B',
    keyMacroDriver: 'रेपो दर कटौती + किफायती आवास मांग',
  },
  {
    sector: 'धातु',
    icon: '⚙️',
    hayek:    { score: 40, stance: 'कम करें',     rationale: 'चीन मंदी और कमोडिटी मूल्य चक्र अप्रत्याशित हैं।' },
    friedman: { score: 45, stance: 'कम करें',     rationale: 'वैश्विक डॉलर ताकत कमोडिटी कीमतों पर दबाव डालती है।' },
    keynes:   { score: 62, stance: 'तटस्थ',    rationale: 'बुनियादी ढांचा धक्का घरेलू स्टील मांग का समर्थन करता है।' },
    consensus: 49, spread: 22,
    regimeOutlook: '6M', forwardBias: 'कम करें', biasColor: '#F97316',
    keyMacroDriver: 'चीन मांग + वैश्विक कमोडिटी चक्र + INR',
  },
  {
    sector: 'ऊर्जा',
    icon: '⚡',
    hayek:    { score: 55, stance: 'तटस्थ',    rationale: 'मिश्रित: नवीकरणीय सब्सिडी द्वारा विकृत; O&G में वास्तविक मूल्य निर्धारण शक्ति है।' },
    friedman: { score: 60, stance: 'तटस्थ',    rationale: 'ऊर्जा मुद्रास्फीति पारित मूल्य निर्धारण जटिलता बनाता है।' },
    keynes:   { score: 72, stance: 'जमा करें', rationale: 'नवीकरणीय बुनियादी ढांचा हैं — सरकारी गुणक लागू होता है।' },
    consensus: 62, spread: 17,
    regimeOutlook: '12M', forwardBias: 'जमा करें', biasColor: '#10B981',
    keyMacroDriver: 'कच्चे तेल की कीमत + नवीकरणीय नीति + सब्सिडी व्यवस्था',
  },
  {
    sector: 'उपभोक्ता',
    icon: '🛍️',
    hayek:    { score: 65, stance: 'जमा करें', rationale: 'जैविक मांग-संचालित — वैध। मास मार्केट पर प्रीमियम को प्राथमिकता दें।' },
    friedman: { score: 63, stance: 'तटस्थ',    rationale: 'वास्तविक मजदूरी पर मुद्रास्फीति निचोड़ एक खींच है। सावधानी से निगरानी करें।' },
    keynes:   { score: 78, stance: 'जमा करें', rationale: 'पशु आत्माएं और आत्मविश्वास बढ़ रहा है। कटौती पर विवेकाधीन पुनर्मूल्यांकन।' },
    consensus: 69, spread: 15,
    regimeOutlook: '6M', forwardBias: 'जमा करें', biasColor: '#10B981',
    keyMacroDriver: 'वास्तविक मजदूरी वृद्धि + दर कटौती भावना + शहरी आत्मविश्वास',
  },
];

// ── ऐतिहासिक सहसंबंध ──────────────────────────────────────────────────────
export interface HistoricalCorrelation {
  id: string;
  title: string;
  condition: string;
  outcome: string;
  winRate: number;
  avgReturn: string;
  instances: number;
  periods: string[];
  regimeMatch: boolean;
  confidence: string;
  confidenceColor: string;
  philosopher: 'Hayek' | 'Friedman' | 'Keynes' | 'All';
  philosopherColor: string;
}

export const HISTORICAL_CORRELATIONS: HistoricalCorrelation[] = [
  {
    id: 'cpi-pharma',
    title: 'CPI > 5% + रेपो दर विराम → फार्मा बेहतर प्रदर्शन',
    condition: 'CPI 5% से ऊपर RBI विस्तारित विराम के साथ (3+ बैठकें)',
    outcome: 'अगले 6 महीनों में फार्मा ने Nifty50 को औसतन 8.4% से हराया',
    winRate: 80,
    avgReturn: '+8.4% अल्फा',
    instances: 5,
    periods: ['2011–12', '2014', '2018–19', '2022', '2023–24'],
    regimeMatch: true,
    confidence: 'उच्च',
    confidenceColor: '#10B981',
    philosopher: 'Hayek',
    philosopherColor: '#818CF8',
  },
  {
    id: 'rate-pause-it',
    title: 'विस्तारित दर विराम → IT बैंकिंग बनाम कम प्रदर्शन',
    condition: 'रेपो दर 4+ लगातार MPC बैठकों के लिए अपरिवर्तित',
    outcome: 'IT ने 6M में औसतन बैंकिंग से 6.2% कम प्रदर्शन किया',
    winRate: 75,
    avgReturn: '-6.2% सापेक्ष',
    instances: 4,
    periods: ['2015–16', '2019', '2021', '2023–24'],
    regimeMatch: true,
    confidence: 'उच्च',
    confidenceColor: '#10B981',
    philosopher: 'Friedman',
    philosopherColor: '#34D399',
  },
  {
    id: 'fiscal-infra',
    title: 'सरकारी पूंजीगत व्यय वृद्धि → बुनियादी ढांचा 12M बेहतर प्रदर्शन',
    condition: 'केंद्रीय सरकारी पूंजीगत व्यय लगातार 2+ वर्षों के लिए > 25% YoY बढ़ता है',
    outcome: 'अगले 12M में बुनियादी ढांचा ने Nifty50 को 14.2% से हराया',
    winRate: 67,
    avgReturn: '+14.2% अल्फा',
    instances: 3,
    periods: ['2004–06', '2009–11', '2022–24'],
    regimeMatch: true,
    confidence: 'मध्यम',
    confidenceColor: '#F59E0B',
    philosopher: 'Keynes',
    philosopherColor: '#FB923C',
  },
  {
    id: 'late-cycle-quality',
    title: 'उत्तर-चक्र व्यवस्था → गुणवत्ता कारक प्रभुत्व',
    condition: 'GDP चिपचिपी मुद्रास्फीति के साथ धीमा होता है',
    outcome: '12M में उच्च-ROE गुणवत्ता ने बाजार को ~11% से हराया',
    winRate: 83,
    avgReturn: '+11% अल्फा',
    instances: 6,
    periods: ['2007', '2011', '2015', '2018', '2022', '2024'],
    regimeMatch: true,
    confidence: 'उच्च',
    confidenceColor: '#10B981',
    philosopher: 'All',
    philosopherColor: '#D4AF37',
  },
];

// ── मुद्रा संवेदनशीलता मैट्रिक्स ────────────────────────────────────────────
export interface CurrencySensitivityEntry {
  sector: string;
  icon: string;
  revenueExposure: string;
  costExposure: string;
  inrDepreciation1pct: number;
  inrAppreciation1pct: number;
  netBias: string;
  biasColor: string;
  keyExplanation: string;
  examples: string[];
}

export const CURRENCY_SENSITIVITY: CurrencySensitivityEntry[] = [
  { sector:'IT', icon:'💻', revenueExposure:'उच्च USD', costExposure:'निम्न USD', inrDepreciation1pct: 1.8, inrAppreciation1pct:-1.8, netBias:'कमजोर INR से लाभ', biasColor:'#10B981', keyExplanation:'निर्यात-भारी राजस्व, INR लागत।', examples:['TCS','INFY','HCLTECH','WIPRO'] },
  { sector:'फार्मा', icon:'💊', revenueExposure:'उच्च USD', costExposure:'मध्यम USD', inrDepreciation1pct: 1.2, inrAppreciation1pct:-1.2, netBias:'कमजोर INR से लाभ', biasColor:'#10B981', keyExplanation:'API आयात ऑफसेट के साथ निर्यात राजस्व।', examples:['SUNPHARMA','DRREDDY','DIVISLAB'] },
  { sector:'ऑटो', icon:'🚗', revenueExposure:'निम्न USD', costExposure:'मध्यम USD', inrDepreciation1pct:-0.8, inrAppreciation1pct: 0.8, netBias:'मजबूत INR से लाभ', biasColor:'#EF4444', keyExplanation:'आयातित घटक INR कमजोर होने पर लागत बढ़ाते हैं।', examples:['MARUTI','M&M','BAJAJ-AUTO'] },
  { sector:'FMCG', icon:'🛒', revenueExposure:'कोई नहीं', costExposure:'मध्यम USD', inrDepreciation1pct:-0.6, inrAppreciation1pct: 0.6, netBias:'मजबूत INR से लाभ', biasColor:'#EF4444', keyExplanation:'पाम तेल/कच्चे डेरिवेटिव USD-जुड़े इनपुट हैं।', examples:['HINDUNILVR','NESTLEIND','BRITANNIA'] },
  { sector:'बैंकिंग', icon:'🏦', revenueExposure:'कोई नहीं', costExposure:'कोई नहीं', inrDepreciation1pct:-0.3, inrAppreciation1pct: 0.3, netBias:'मजबूत INR से लाभ', biasColor:'#EF4444', keyExplanation:'प्रवाह, जोखिम प्रीमियम और दरों के माध्यम से FX प्रभाव।', examples:['HDFCBANK','ICICIBANK','SBIN'] },
];

// ── दैनिक संक्षिप्त ────────────────────────────────────────────────────────
export interface DailyBriefSection {
  title: string;
  icon: string;
  content: string;
  philosopher?: 'Hayek' | 'Friedman' | 'Keynes';
  philosopherColor?: string;
}

export function getDailyBrief(): { date: string; headline: string; regimeLabel: string; sections: DailyBriefSection[] } {
  const d = new Date();
  const dateStr = d.toLocaleDateString('hi-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  return {
    date: dateStr,
    headline: 'उत्तर-चक्र विस्तार जारी — गति पर गुणवत्ता',
    regimeLabel: 'उत्तर-चक्र ऋण विस्तार · मध्यम दार्शनिक विभाजन',
    sections: [
      { title:'मैक्रो पल्स', icon:'🌍', content:'CPI कम रुझान लेकिन चिपचिपे घटक बने रहते हैं। RBI विराम पर है। M3 पुनः त्वरित हो रहा है — एक विलंबित जोखिम संकेत।' },
      { title:'Hayek चेतावनी देता है', icon:'🏛️', philosopher:'Hayek', philosopherColor:'#818CF8', content:'राजकोषीय प्रभुत्व पूंजी आवंटन को विकृत कर सकता है। लीवरेज और ऋण गुणवत्ता देखें।' },
      { title:'Friedman देखता है', icon:'📊', philosopher:'Friedman', philosopherColor:'#34D399', content:'मुद्रा आपूर्ति > नाममात्र GDP मायने रखता है। नीति अंतराल लंबे और परिवर्तनशील हैं।' },
      { title:'Keynes कार्रवाई का आग्रह करता है', icon:'⚙️', philosopher:'Keynes', philosopherColor:'#FB923C', content:'मांग समर्थन पशु आत्माओं को बनाए रखता है। गुणक मायने रखते हैं।' },
      { title:'सेक्टर स्पॉटलाइट', icon:'🔭', content:'बैंकिंग/उपभोक्ता मजबूत। बुनियादी ढांचा सबसे अधिक विभाजित। गुणवत्ता उत्तर-चक्र व्यवस्थाओं पर हावी है।' },
      { title:'जोखिम रडार', icon:'⚠️', content:'खाद्य मुद्रास्फीति पलटाव, USD ताकत, और राजकोषीय फिसलन शीर्ष निगरानी बिंदु हैं।' },
    ],
  };
}

// ── गतिशील दार्शनिक समझौता स्कोरिंग ─────────────────────────────────────────
export function deriveDynamicAgreement(
  philosopher: string,
  regimeLabel: string,
  indicators: { signal: string }[],
  moodScore?: number,
  liveContext?: { breadthBullish?: number; fiiNetCr?: number; derivativesSignal?: number; historicalSpread30d?: number; evidenceRecencyHours?: number; pricedIn?: boolean }
): number {
  const positives = indicators.filter(i => i.signal === 'positive').length;
  const negatives = indicators.filter(i => i.signal === 'negative').length;

  let score = 50 + ((positives - negatives) * 10);

  if (liveContext) {
    if (liveContext.breadthBullish !== undefined) {
      score += liveContext.breadthBullish > 60 ? 8 : liveContext.breadthBullish < 40 ? -8 : 0;
    }
    if (liveContext.fiiNetCr !== undefined) {
      score += liveContext.fiiNetCr > 2000 ? 6 : liveContext.fiiNetCr < -2000 ? -6 : 0;
    }
    if (liveContext.derivativesSignal !== undefined) {
      score += liveContext.derivativesSignal > 0 ? 5 : liveContext.derivativesSignal < 0 ? -5 : 0;
    }
  }

  if (liveContext?.historicalSpread30d !== undefined && liveContext?.breadthBullish !== undefined) {
    const dev = liveContext.breadthBullish - liveContext.historicalSpread30d;
    score += dev > 10 ? 5 : dev < -10 ? -5 : 0;
  }

  if (liveContext?.evidenceRecencyHours !== undefined) {
    score += liveContext.evidenceRecencyHours < 6 ? 5 : liveContext.evidenceRecencyHours > 48 ? -4 : 0;
  }

  if (liveContext?.pricedIn === true) {
    score = Math.round(score * 0.75);
  }

  const regime = (regimeLabel || '').toUpperCase();

  if (regime.includes('LATE-CYCLE') || regime.includes('उत्तर-चक्र')) {
    if (philosopher === 'Hayek') score += 10;
    if (philosopher === 'Keynes') score -= 6;
  }

  if (typeof moodScore === 'number') {
    const delta = Math.round((moodScore - 50) / 4);
    if (philosopher === 'Keynes') score += delta;
    if (philosopher === 'Hayek') score -= delta;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
