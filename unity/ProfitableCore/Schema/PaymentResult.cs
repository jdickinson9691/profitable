namespace Profitable.Core.Schema;

// Ports src/data/types/paymentResult.ts's PaymentResult = PaymentPaid |
// PaymentNotDue | PaymentInsufficientFunds discriminated union (three
// outcomes, not two -- "not due yet" is a normal no-op, distinct from an
// actual failure).
public abstract class PaymentResult
{
    public abstract string Status { get; }
}

public sealed class PaymentPaid : PaymentResult
{
    public override string Status => "paid";
    public CrewMember UpdatedCrewMember { get; init; } = new();
    public Wallet UpdatedWallet { get; init; } = new();
}

public sealed class PaymentNotDue : PaymentResult
{
    public override string Status => "not-due";
}

public sealed class PaymentInsufficientFunds : PaymentResult
{
    public override string Status => "insufficient-funds";
}
