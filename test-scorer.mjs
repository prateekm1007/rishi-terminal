import { CRYPTO_ASSETS } from './data/crypto.js';
import { scoreBitcoinMaximalist } from './lib/scorers/crypto/bitcoin.js';

const btc = CRYPTO_ASSETS.find(c => c.symbol === 'BTC');
console.log('BTC Data:', btc);

const result = scoreBitcoinMaximalist(btc);
console.log('Bitcoin Scorer Result:', result);