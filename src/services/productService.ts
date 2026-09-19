import type { PriceHistoryEntry, Product } from '../types';
import type { AppStore } from './store';
import { uid } from './idGenerator';
import { recordInitialStock } from './inventoryService';

/**
 * Builds the merged price history when a product's pricing changes, preserving
 * the previous record as an entry in the history trail.
 */
export function mergePriceHistory(prev: Product, next: Product): Product {
  const history: PriceHistoryEntry[] = [...(prev.priceHistory || [])];
  if (prev.salePrice !== next.salePrice || prev.costPrice !== next.costPrice) {
    history.push({
      changedAt: new Date().toISOString(),
      fromSalePrice: prev.salePrice,
      toSalePrice: next.salePrice,
      fromCostPrice: prev.costPrice,
      toCostPrice: next.costPrice,
    });
  }
  return { ...next, priceHistory: history };
}

export function addProduct(store: AppStore, input: Omit<Product, 'id'>): Product {
  const newProduct: Product = { ...input, id: uid('prod') };
  store.setProducts((prev) => [newProduct, ...prev]);
  if (newProduct.currentStock > 0) {
    recordInitialStock(store, newProduct.id, newProduct.name, newProduct.currentStock, newProduct.unit, newProduct.batchNumber);
  }
  return newProduct;
}

export function updateProduct(store: AppStore, product: Product): void {
  store.setProducts((prev) => prev.map((item) => (item.id === product.id ? mergePriceHistory(item, product) : item)));
}

export function bulkUpdateProducts(store: AppStore, updatedList: Product[]): void {
  const map = new Map(updatedList.map((p) => [p.id, p]));
  store.setProducts((prev) => prev.map((item) => (map.has(item.id) ? mergePriceHistory(item, map.get(item.id)!) : item)));
}

export function deleteProduct(store: AppStore, id: string): void {
  store.setProducts((prev) => prev.filter((item) => item.id !== id));
}

export function bulkDeleteProducts(store: AppStore, ids: string[]): void {
  const set = new Set(ids);
  store.setProducts((prev) => prev.filter((item) => !set.has(item.id)));
}