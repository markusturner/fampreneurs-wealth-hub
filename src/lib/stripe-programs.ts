// Stripe program & pricing configuration
export type ProgramId = 'fbu' | 'tfv' | 'tfba';

export interface PricingOption {
  label: string;
  price_id: string;
  amount: number; // cents
  interval: string; // display label
  mode: 'subscription' | 'payment';
}

export interface Program {
  id: ProgramId;
  name: string;
  shortName: string;
  pricing: PricingOption[];
}

export const PROGRAMS: Program[] = [
  {
    id: 'fbu',
    name: 'Family Business University',
    shortName: 'FBU',
    pricing: [
      { label: '$97/month', price_id: 'price_1T1djeKKuJwlPZFrDTlV3lxH', amount: 9700, interval: 'Monthly', mode: 'subscription' },
      { label: '$247/quarter', price_id: 'price_1T1djuKKuJwlPZFrlK2XGRS0', amount: 24700, interval: 'Quarterly', mode: 'subscription' },
      { label: '$897/year', price_id: 'price_1T1dk5KKuJwlPZFrFxNE9FD7', amount: 89700, interval: 'Annual', mode: 'subscription' },
    ],
  },
  {
    id: 'tfv',
    name: 'The Family Vault',
    shortName: 'TFV',
    pricing: [
      { label: '$2,500 (Paid in Full)', price_id: 'price_1T1dkMKKuJwlPZFrHGawpC2Y', amount: 250000, interval: 'One-Time', mode: 'payment' },
      { label: '$1,000/mo for 3 months', price_id: 'price_1T1dkaKKuJwlPZFrDi8rFpMT', amount: 100000, interval: '3-Month Plan', mode: 'subscription' },
      { label: '$500/mo for 6 months', price_id: 'price_1T1dknKKuJwlPZFrn92aAO2L', amount: 50000, interval: '6-Month Plan', mode: 'subscription' },
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
];

export const getProgramById = (id: ProgramId) => PROGRAMS.find(p => p.id === id);
export const getProgramByName = (name: string) => PROGRAMS.find(p => p.name === name);
