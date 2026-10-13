export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export const SubscriptionStatus = {
  NONE: 'NONE',
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export interface SchoolSubscription {
  status: SubscriptionStatus;
  plan?: string;
  renewalDate?: string;
  /** Provider is never hard-coded in product logic; see docs/DECISION_LOG.md. */
  provider?: string;
}

/** School representation returned to ordinary users. Contact details are omitted. */
export interface SchoolSummary {
  id: string;
  name: string;
  address: Address;
  verified: boolean;
  scholarCount: number;
  preceptorCount: number;
}

/** Full school representation, returned only to school and platform administrators. */
export interface SchoolDetail extends SchoolSummary {
  contactEmail?: string;
  contactPhone?: string;
  adminUserId?: string;
  subscription: SchoolSubscription;
  createdAt: string;
  updatedAt: string;
}
