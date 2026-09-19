import type { Customer, LoyaltySettings } from '../types';
import type { AppStore } from './store';
import { uid } from './idGenerator';

export function updateLoyaltySettings(store: AppStore, settings: LoyaltySettings): void {
  store.setLoyaltySettings(settings);
}

export function addCustomer(
  store: AppStore,
  customerData: Omit<Customer, 'id' | 'loyaltyPointsBalance' | 'totalPointsEarned' | 'totalPointsRedeemed' | 'createdAt'>
): Customer {
  const newCust: Customer = {
    ...customerData,
    id: uid('cust'),
    loyaltyPointsBalance: 0,
    totalPointsEarned: 0,
    totalPointsRedeemed: 0,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  store.setCustomers((prev) => [newCust, ...prev]);
  return newCust;
}