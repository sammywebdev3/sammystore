import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  description: string;
  amount: number;
  status: string;
  metadata?: any;
  reference?: string;
  activationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'deposit', 'withdrawal', 'account_purchase', 'transfer', 'refund',
      'manual_fund_request', 'number_purchase',
      // The following are actually created by app/api routes but were
      // missing from this enum, which made every Transaction.create() call
      // using them throw a Mongoose ValidationError:
      'admin_credit',      // app/api/admin/add-money
      'admin_debit',       // app/api/admin/deduct-money
      'smm',               // app/api/smm/order, app/api/cart/checkout (smm items)
      'wallet_fund',       // app/api/wallet/fund-paystack, verify-paystack
      'welcome_bonus',     // app/api/wallet/verify-paystack (first-deposit bonus)
      'virtual_number',    // app/api/numbers/tiger/buy, dashboard/stats
    ]
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    required: true,
    // 'refunded' was missing here even though app/api/numbers/tiger/cancel
    // sets it directly, which made every cancel-and-refund throw a
    // ValidationError on save instead of completing.
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending'
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  reference: {
    type: String,
    unique: true,
    sparse: true
  },
  activationId: {
    type: String
  }
}, {
  timestamps: true
});

// Prevent overwriting the model if it already exists
const Transaction = (mongoose.models.Transaction as Model<ITransaction>) || mongoose.model<ITransaction>('Transaction', transactionSchema);
export default Transaction;
