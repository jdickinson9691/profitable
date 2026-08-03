using System.Text.Json.Serialization;

namespace ProfitableCore.Tests.Parity;

// Deserialization shape for unity/parity/ts-parity-results.json, written
// by scripts/parityHarness.ts. Field names use [JsonPropertyName] to
// match the TS-side camelCase JSON exactly rather than relying on
// System.Text.Json's case-insensitive matching -- this file is read-only
// input from another language's toolchain, so being explicit here is
// worth the verbosity.
public class ParityCorpus
{
    [JsonPropertyName("generatedAt")]
    public string GeneratedAt { get; set; } = string.Empty;

    [JsonPropertyName("tierColorCases")]
    public List<TierColorCase> TierColorCases { get; set; } = new();

    [JsonPropertyName("rollQualityCases")]
    public List<RollQualityCase> RollQualityCases { get; set; } = new();

    [JsonPropertyName("refineCases")]
    public List<RefineCase> RefineCases { get; set; } = new();

    [JsonPropertyName("craftCases")]
    public List<CraftCase> CraftCases { get; set; } = new();

    [JsonPropertyName("galaxyCases")]
    public List<GalaxyCase> GalaxyCases { get; set; } = new();

    [JsonPropertyName("planetResourceCycleCases")]
    public List<PlanetResourceCycleCase> PlanetResourceCycleCases { get; set; } = new();

    [JsonPropertyName("gcprCases")]
    public List<GcprCase> GcprCases { get; set; } = new();

    [JsonPropertyName("createListingCases")]
    public List<CreateListingCase> CreateListingCases { get; set; } = new();

    [JsonPropertyName("applyDriftCases")]
    public List<ApplyDriftCase> ApplyDriftCases { get; set; } = new();

    [JsonPropertyName("applyRecoveryCases")]
    public List<ApplyRecoveryCase> ApplyRecoveryCases { get; set; } = new();

    [JsonPropertyName("seasonCases")]
    public List<SeasonCase> SeasonCases { get; set; } = new();

    [JsonPropertyName("emergencyCases")]
    public List<EmergencyCase> EmergencyCases { get; set; } = new();

    [JsonPropertyName("globalPriceCases")]
    public List<GlobalPriceCase> GlobalPriceCases { get; set; } = new();

    [JsonPropertyName("purchaseListingCases")]
    public List<PurchaseListingCase> PurchaseListingCases { get; set; } = new();

    [JsonPropertyName("sellToMarketCases")]
    public List<SellToMarketCase> SellToMarketCases { get; set; } = new();

    [JsonPropertyName("sellToGlobalMarketCases")]
    public List<SellToGlobalMarketCase> SellToGlobalMarketCases { get; set; } = new();

    [JsonPropertyName("expireListingsCases")]
    public List<ExpireListingsCase> ExpireListingsCases { get; set; } = new();
}

public class TierColorCase
{
    [JsonPropertyName("value")]
    public double Value { get; set; }

    [JsonPropertyName("expectedTier")]
    public string ExpectedTier { get; set; } = string.Empty;
}

public class RollQualityCase
{
    [JsonPropertyName("resourceId")]
    public string ResourceId { get; set; } = string.Empty;

    [JsonPropertyName("randomSequence")]
    public List<double> RandomSequence { get; set; } = new();

    [JsonPropertyName("expectedRoll")]
    public Dictionary<string, int?> ExpectedRoll { get; set; } = new();
}

public class SerializedInstance
{
    [JsonPropertyName("resourceId")]
    public string ResourceId { get; set; } = string.Empty;

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("qualities")]
    public Dictionary<string, int?> Qualities { get; set; } = new();
}

public class RefineCase
{
    [JsonPropertyName("inputs")]
    public List<SerializedInstance> Inputs { get; set; } = new();

    [JsonPropertyName("refinerTier")]
    public string RefinerTier { get; set; } = string.Empty;

    [JsonPropertyName("randomSequence")]
    public List<double> RandomSequence { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public ExpectedRefineResult ExpectedResult { get; set; } = new();
}

public class ExpectedRefineResult
{
    [JsonPropertyName("qualities")]
    public Dictionary<string, int?> Qualities { get; set; } = new();

    [JsonPropertyName("outputTier")]
    public string OutputTier { get; set; } = string.Empty;

    [JsonPropertyName("refundUnits")]
    public int RefundUnits { get; set; }
}

public class CraftCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("recipeId")]
    public string RecipeId { get; set; } = string.Empty;

    [JsonPropertyName("inputs")]
    public List<SerializedInstance> Inputs { get; set; } = new();

    [JsonPropertyName("schematicTier")]
    public string SchematicTier { get; set; } = string.Empty;

    [JsonPropertyName("crafterTier")]
    public string CrafterTier { get; set; } = string.Empty;

    [JsonPropertyName("randomSequence")]
    public List<double> RandomSequence { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public ExpectedCraftResult ExpectedResult { get; set; } = new();
}

public class ExpectedCraftResult
{
    [JsonPropertyName("accepted")]
    public bool Accepted { get; set; }

    [JsonPropertyName("qualities")]
    public Dictionary<string, int?>? Qualities { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }
}

public class SerializedPosition
{
    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }
}

public class SerializedPlanet
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("planetType")]
    public string? PlanetType { get; set; }

    [JsonPropertyName("tier")]
    public string? Tier { get; set; }

    [JsonPropertyName("position")]
    public SerializedPosition? Position { get; set; }

    [JsonPropertyName("producibleResourceIds")]
    public List<string> ProducibleResourceIds { get; set; } = new();

    [JsonPropertyName("specialtyResourceId")]
    public string? SpecialtyResourceId { get; set; }

    [JsonPropertyName("resourceQualities")]
    public Dictionary<string, Dictionary<string, int?>> ResourceQualities { get; set; } = new();

    [JsonPropertyName("discovered")]
    public bool? Discovered { get; set; }

    [JsonPropertyName("colonistCount")]
    public int? ColonistCount { get; set; }
}

public class ExpectedGalaxy
{
    [JsonPropertyName("seed")]
    public string Seed { get; set; } = string.Empty;

    [JsonPropertyName("planets")]
    public List<SerializedPlanet> Planets { get; set; } = new();
}

public class GalaxyCase
{
    [JsonPropertyName("seed")]
    public string Seed { get; set; } = string.Empty;

    [JsonPropertyName("planetCount")]
    public int PlanetCount { get; set; }

    [JsonPropertyName("expectedGalaxy")]
    public ExpectedGalaxy ExpectedGalaxy { get; set; } = new();
}

public class ExpectedResourcesForCycle
{
    [JsonPropertyName("producibleResourceIds")]
    public List<string> ProducibleResourceIds { get; set; } = new();

    [JsonPropertyName("specialtyResourceId")]
    public string? SpecialtyResourceId { get; set; }

    [JsonPropertyName("resourceQualities")]
    public Dictionary<string, Dictionary<string, int?>> ResourceQualities { get; set; } = new();
}

public class PlanetResourceCycleCase
{
    [JsonPropertyName("seed")]
    public string Seed { get; set; } = string.Empty;

    [JsonPropertyName("tier")]
    public string Tier { get; set; } = string.Empty;

    [JsonPropertyName("planetType")]
    public string PlanetType { get; set; } = string.Empty;

    [JsonPropertyName("cycleIndex")]
    public int CycleIndex { get; set; }

    [JsonPropertyName("expectedResult")]
    public ExpectedResourcesForCycle ExpectedResult { get; set; } = new();
}

public class GcprCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("planet")]
    public SerializedPlanet Planet { get; set; } = new();

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("isStartingPlanet")]
    public bool IsStartingPlanet { get; set; }

    [JsonPropertyName("expectedResult")]
    public ExpectedResourcesForCycle ExpectedResult { get; set; } = new();
}

// ---- Sub-Phase B (Trading) parity DTOs (agent-45-unity-trading-parity
// -validation.md). Location is a raw JsonElement rather than a strongly
// typed field: the TypeScript MarketLocation union serializes as either
// the string "global" or the object { planetId }, which has no single
// natural System.Text.Json shape -- TradingParityTests.ParseLocation
// converts it to a real Profitable.Core.Schema.MarketLocation at the
// point of use instead of forcing a custom converter here. ----

public class SerializedListing
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("itemId")]
    public string ItemId { get; set; } = string.Empty;

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("pricePerUnit")]
    public double PricePerUnit { get; set; }

    [JsonPropertyName("marketTier")]
    public string MarketTier { get; set; } = string.Empty;

    [JsonPropertyName("location")]
    public System.Text.Json.JsonElement Location { get; set; }

    [JsonPropertyName("createdByPlayerId")]
    public string CreatedByPlayerId { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public long CreatedAt { get; set; }

    [JsonPropertyName("expiresAt")]
    public long ExpiresAt { get; set; }
}

public class SerializedMarketState
{
    [JsonPropertyName("planetId")]
    public string PlanetId { get; set; } = string.Empty;

    [JsonPropertyName("itemId")]
    public string ItemId { get; set; } = string.Empty;

    [JsonPropertyName("currentPrice")]
    public double CurrentPrice { get; set; }

    [JsonPropertyName("basePrice")]
    public double BasePrice { get; set; }
}

public class SerializedWallet
{
    [JsonPropertyName("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [JsonPropertyName("credits")]
    public double Credits { get; set; }
}

public class CreateListingCase
{
    [JsonPropertyName("itemInstance")]
    public SerializedInstance ItemInstance { get; set; } = new();

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("pricePerUnit")]
    public double PricePerUnit { get; set; }

    [JsonPropertyName("location")]
    public System.Text.Json.JsonElement Location { get; set; }

    [JsonPropertyName("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("expectedListing")]
    public SerializedListing ExpectedListing { get; set; } = new();
}

public class ApplyDriftCase
{
    [JsonPropertyName("marketState")]
    public SerializedMarketState MarketState { get; set; } = new();

    [JsonPropertyName("unitsTraded")]
    public int UnitsTraded { get; set; }

    [JsonPropertyName("direction")]
    public string Direction { get; set; } = string.Empty;

    [JsonPropertyName("expectedMarketState")]
    public SerializedMarketState ExpectedMarketState { get; set; } = new();
}

public class ApplyRecoveryCase
{
    [JsonPropertyName("marketState")]
    public SerializedMarketState MarketState { get; set; } = new();

    [JsonPropertyName("elapsedHours")]
    public double ElapsedHours { get; set; }

    [JsonPropertyName("expectedMarketState")]
    public SerializedMarketState ExpectedMarketState { get; set; } = new();
}

public class SerializedSeasonalEffect
{
    [JsonPropertyName("season")]
    public string Season { get; set; } = string.Empty;

    [JsonPropertyName("cheapCategory")]
    public string CheapCategory { get; set; } = string.Empty;

    [JsonPropertyName("premiumCategory")]
    public string PremiumCategory { get; set; } = string.Empty;
}

public class SeasonCase
{
    [JsonPropertyName("planetId")]
    public string PlanetId { get; set; } = string.Empty;

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("categories")]
    public List<string> Categories { get; set; } = new();

    [JsonPropertyName("expectedSeason")]
    public string ExpectedSeason { get; set; } = string.Empty;

    [JsonPropertyName("expectedEffect")]
    public SerializedSeasonalEffect? ExpectedEffect { get; set; }

    [JsonPropertyName("expectedMultiplierForFirstCategory")]
    public double? ExpectedMultiplierForFirstCategory { get; set; }
}

public class SerializedEmergency
{
    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("endsAt")]
    public long EndsAt { get; set; }
}

public class EmergencyCase
{
    [JsonPropertyName("planetId")]
    public string PlanetId { get; set; } = string.Empty;

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("categories")]
    public List<string> Categories { get; set; } = new();

    [JsonPropertyName("expectedEmergency")]
    public SerializedEmergency? ExpectedEmergency { get; set; }

    [JsonPropertyName("expectedMultiplierForFirstCategory")]
    public double? ExpectedMultiplierForFirstCategory { get; set; }
}

public class GlobalPriceCase
{
    [JsonPropertyName("itemId")]
    public string ItemId { get; set; } = string.Empty;

    [JsonPropertyName("direction")]
    public string Direction { get; set; } = string.Empty;

    [JsonPropertyName("marketStates")]
    public List<SerializedMarketState> MarketStates { get; set; } = new();

    [JsonPropertyName("expectedPrice")]
    public double ExpectedPrice { get; set; }
}

public class SerializedPurchaseResult
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("updatedListing")]
    public SerializedListing? UpdatedListing { get; set; }

    [JsonPropertyName("closed")]
    public bool? Closed { get; set; }

    [JsonPropertyName("quantityPurchased")]
    public int? QuantityPurchased { get; set; }

    [JsonPropertyName("totalPaid")]
    public double? TotalPaid { get; set; }

    [JsonPropertyName("feeDeducted")]
    public double? FeeDeducted { get; set; }

    [JsonPropertyName("proceedsToSeller")]
    public double? ProceedsToSeller { get; set; }

    [JsonPropertyName("updatedMarketState")]
    public SerializedMarketState? UpdatedMarketState { get; set; }
}

public class PurchaseListingCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("listing")]
    public SerializedListing Listing { get; set; } = new();

    [JsonPropertyName("quantityToBuy")]
    public int QuantityToBuy { get; set; }

    [JsonPropertyName("buyerPlayerId")]
    public string BuyerPlayerId { get; set; } = string.Empty;

    [JsonPropertyName("marketState")]
    public SerializedMarketState? MarketState { get; set; }

    [JsonPropertyName("expectedResult")]
    public SerializedPurchaseResult ExpectedResult { get; set; } = new();
}

public class SerializedSellToMarketResult
{
    [JsonPropertyName("quantitySold")]
    public int QuantitySold { get; set; }

    [JsonPropertyName("totalValue")]
    public double TotalValue { get; set; }

    [JsonPropertyName("feeDeducted")]
    public double FeeDeducted { get; set; }

    [JsonPropertyName("proceedsToSeller")]
    public double ProceedsToSeller { get; set; }

    [JsonPropertyName("updatedWallet")]
    public SerializedWallet UpdatedWallet { get; set; } = new();

    [JsonPropertyName("updatedMarketState")]
    public SerializedMarketState UpdatedMarketState { get; set; } = new();
}

public class SellToMarketCase
{
    [JsonPropertyName("itemInstance")]
    public SerializedInstance ItemInstance { get; set; } = new();

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("marketState")]
    public SerializedMarketState MarketState { get; set; } = new();

    [JsonPropertyName("wallet")]
    public SerializedWallet Wallet { get; set; } = new();

    [JsonPropertyName("sellerPlayerId")]
    public string SellerPlayerId { get; set; } = string.Empty;

    [JsonPropertyName("expectedResult")]
    public SerializedSellToMarketResult ExpectedResult { get; set; } = new();
}

public class SerializedSellToGlobalMarketResult
{
    [JsonPropertyName("quantitySold")]
    public int QuantitySold { get; set; }

    [JsonPropertyName("totalValue")]
    public double TotalValue { get; set; }

    [JsonPropertyName("feeDeducted")]
    public double FeeDeducted { get; set; }

    [JsonPropertyName("proceedsToSeller")]
    public double ProceedsToSeller { get; set; }

    [JsonPropertyName("updatedWallet")]
    public SerializedWallet UpdatedWallet { get; set; } = new();
}

public class SellToGlobalMarketCase
{
    [JsonPropertyName("itemInstance")]
    public SerializedInstance ItemInstance { get; set; } = new();

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("marketStates")]
    public List<SerializedMarketState> MarketStates { get; set; } = new();

    [JsonPropertyName("wallet")]
    public SerializedWallet Wallet { get; set; } = new();

    [JsonPropertyName("sellerPlayerId")]
    public string SellerPlayerId { get; set; } = string.Empty;

    [JsonPropertyName("expectedResult")]
    public SerializedSellToGlobalMarketResult ExpectedResult { get; set; } = new();
}

public class SerializedReturnAction
{
    [JsonPropertyName("itemId")]
    public string ItemId { get; set; } = string.Empty;

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [JsonPropertyName("destination")]
    public string Destination { get; set; } = string.Empty;

    [JsonPropertyName("planetId")]
    public string? PlanetId { get; set; }
}

public class SerializedListingExpiryResult
{
    [JsonPropertyName("expired")]
    public List<SerializedListing> Expired { get; set; } = new();

    [JsonPropertyName("returned")]
    public List<SerializedReturnAction> Returned { get; set; } = new();
}

public class ExpireListingsCase
{
    [JsonPropertyName("listings")]
    public List<SerializedListing> Listings { get; set; } = new();

    [JsonPropertyName("currentTimeMs")]
    public long CurrentTimeMs { get; set; }

    [JsonPropertyName("expectedResult")]
    public SerializedListingExpiryResult ExpectedResult { get; set; } = new();
}
