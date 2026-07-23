import User from '@/models/User';
import Transaction from '@/models/Transaction';
import { sendWalletFundedEmail } from '@/lib/email';

const WELCOME_BONUS_AMOUNT = 500;

/**
 * Credits a user's wallet for a successful NeuraPay virtual-account
 * transfer. Called from BOTH the webhook handler and the manual
 * "check status" endpoint, since either one might see the successful
 * payment first (webhook delivery isn't instant/guaranteed).
 *
 * NeuraPay virtual accounts are PERSISTENT per user (see
 * app/api/wallet/fund-neurapay/route.ts) - the same account number can
 * receive many transfers over time, at whatever amount the customer
 * chooses. So unlike the old one-account-per-payment model, this does
 * NOT look up a pre-created pending Transaction. Instead it:
 *   1. Finds the USER by matching the virtual account number.
 *   2. Creates a brand new Transaction for THIS specific transfer.
 *   3. Uses NeuraPay's own transaction reference as our Transaction's
 *      unique `reference` field, so if the webhook fires twice (or the
 *      webhook AND a manual check both see it) for the same transfer,
 *      the second insert hits the unique index and is safely ignored -
 *      that's what prevents double-crediting the same transfer.
 */
export async function creditNeurapayTransaction(params: {
  reference?: string; // NeuraPay's own transaction reference (unique per transfer)
  virtualAccount?: string;
  grossAmount: number;
  netAmount: number;
  providerReference?: string;
}): Promise<{ credited: boolean; alreadyProcessed: boolean; newBalance: number }> {
  const { reference, virtualAccount, grossAmount, netAmount, providerReference } = params;

  if (!virtualAccount) {
    throw new Error('Missing virtual account number - cannot identify which user to credit');
  }
  if (!reference) {
    throw new Error('Missing NeuraPay transaction reference - required for idempotent crediting');
  }

  const user = await User.findOne({
    $or: [
      { 'neurapayAccounts.paga.accountNumber': virtualAccount },
      { 'neurapayAccounts.palmpay.accountNumber': virtualAccount },
    ],
  });

  if (!user) {
    throw new Error(`No user found with NeuraPay virtual account ${virtualAccount}`);
  }

  const creditAmount = netAmount > 0 ? netAmount : grossAmount;

  // Idempotency: try to create the success record FIRST, keyed on
  // NeuraPay's own reference. If one already exists for this transfer
  // (duplicate webhook delivery, or webhook + manual check racing each
  // other), this throws E11000 and we treat it as already processed
  // instead of crediting twice.
  let txn;
  try {
    txn = await Transaction.create({
      userId: user._id,
      type: 'wallet_fund',
      description: `Wallet funding via NeuraPay (₦${creditAmount})`,
      amount: creditAmount,
      status: 'success',
      reference: `neurapay-${reference}`,
      metadata: { accountNumber: virtualAccount, providerReference, grossAmount, netAmount },
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      const existingUser = await User.findById(user._id);
      return { credited: false, alreadyProcessed: true, newBalance: existingUser?.walletBalance ?? 0 };
    }
    throw err;
  }

  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    { $inc: { walletBalance: creditAmount } },
    { new: true }
  );

  let finalBalance = updatedUser?.walletBalance ?? 0;

  const successfulDepositCount = await Transaction.countDocuments({
    userId: user._id,
    type: 'wallet_fund',
    status: 'success',
  });

  if (successfulDepositCount === 1) {
    try {
      await Transaction.create({
        userId: user._id,
        type: 'welcome_bonus',
        description: 'Welcome bonus for first deposit',
        amount: WELCOME_BONUS_AMOUNT,
        status: 'success',
        reference: `welcome-bonus-${user._id}`,
      });

      const bonusedUser = await User.findByIdAndUpdate(
        user._id,
        { $inc: { walletBalance: WELCOME_BONUS_AMOUNT } },
        { new: true }
      );

      finalBalance = bonusedUser?.walletBalance ?? finalBalance;
    } catch (bonusError: any) {
      if (bonusError?.code !== 11000) {
        console.error('Welcome bonus error:', bonusError.message);
      }
    }
  }

  sendWalletFundedEmail({
    to: user.email,
    amount: creditAmount,
    newBalance: finalBalance,
  }).catch((err) => console.error('Wallet funded email failed:', err));

  return { credited: true, alreadyProcessed: false, newBalance: finalBalance };
}
