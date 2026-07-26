// Phase 3 GDD §2.2 -- a player's balance in the single universal currency
// ("Credits"). One Wallet per player; no per-tier or per-planet currencies.
export interface Wallet {
  playerId: string;
  credits: number;
}
