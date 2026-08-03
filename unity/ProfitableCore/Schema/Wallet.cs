namespace Profitable.Core.Schema;

// Ports src/data/types/wallet.ts. A player's balance in the single
// universal currency ("Credits"). One Wallet per player; no per-tier or
// per-planet currencies.
public class Wallet
{
    public string PlayerId { get; set; } = string.Empty;
    public double Credits { get; set; }
}
