// Stripe program & pricing configuration
export type ProgramId = 'fbu' | 'tfv' | 'tfba' | 'tffm';

export interface PricingOption {
  label: string;
  price_id: string;
  amount: number; // cents
  interval: string; // display label
  mode: 'subscription' | 'payment';
  tier?: 'lite' | 'standard';
}

export interface Program {
  id: ProgramId;
  name: string;
  shortName: string;
  pricing: PricingOption[];
}

// TruHeirs Lite — FBU community-only access
export const LITE_PRICING: PricingOption[] = [
  { label: '$47/month', price_id: 'price_1TbLymKKuJwlPZFrYjUNRGcl', amount: 4700, interval: 'Monthly', mode: 'subscription', tier: 'lite' },
  { label: '$127/quarter', price_id: 'price_1TbMCMKKuJwlPZFrvzkgglxC', amount: 12700, interval: 'Quarterly', mode: 'subscription', tier: 'lite' },
  { label: '$547/year', price_id: 'price_1TbMCfKKuJwlPZFrSbCNsllH', amount: 54700, interval: 'Annual', mode: 'subscription', tier: 'lite' },
];

export const LITE_PRICE_IDS = LITE_PRICING.map(p => p.price_id);

export const PROGRAMS: Program[] = [
  {
    id: 'fbu',
    name: 'Family Business University',
    shortName: 'FBU',
    pricing: [
      { label: '$97/month', price_id: 'price_1T1djeKKuJwlPZFrDTlV3lxH', amount: 9700, interval: 'Monthly', mode: 'subscription' },
      { label: '$247/quarter', price_id: 'price_1T1djuKKuJwlPZFrlK2XGRS0', amount: 24700, interval: 'Quarterly', mode: 'subscription' },
      { label: '$897/year', price_id: 'price_1T1dk5KKuJwlPZFrFxNE9FD7', amount: 89700, interval: 'Annual', mode: 'subscription' },
      ...LITE_PRICING,
    ],
  },
  {
    id: 'tfv',
    name: 'The Family Vault',
    shortName: 'TFV',
    pricing: [
      { label: '$5,000 (Paid in Full)', price_id: 'price_1T1dkMKKuJwlPZFrHGawpC2Y', amount: 500000, interval: 'One-Time', mode: 'payment' },
      { label: '$1,000/mo for 6 months', price_id: 'price_1T1dknKKuJwlPZFrn92aAO2L', amount: 100000, interval: '6-Month Plan', mode: 'subscription' },
    ],
  },
  {
    id: 'tfba',
    name: 'The Family Business Accelerator',
    shortName: 'TFBA',
    pricing: [
      { label: '$7,500 (Paid in Full)', price_id: 'price_1T1dl0KKuJwlPZFrnPpruCYU', amount: 750000, interval: 'One-Time', mode: 'payment' },
      { label: '$3,000/mo for 3 months', price_id: 'price_1T1dlOKKuJwlPZFrx1Ppbyz4', amount: 300000, interval: '3-Month Plan', mode: 'subscription' },
    ],
  },
  {
    id: 'tffm',
    name: 'The Family Fortune Mastermind',
    shortName: 'TFFM',
    pricing: [
      { label: '$40,000 (Paid in Full)', price_id: 'price_tffm_pif', amount: 4000000, interval: 'One-Time', mode: 'payment' },
      { label: '$3,500/mo for 12 months', price_id: 'price_tffm_monthly', amount: 350000, interval: '12-Month Plan', mode: 'subscription' },
    ],
  },
];

export const getProgramById = (id: ProgramId) => PROGRAMS.find(p => p.id === id);
export const getProgramByName = (name: string) => PROGRAMS.find(p => p.name === name);
export const isLitePriceId = (priceId: string) => LITE_PRICE_IDS.includes(priceId);
