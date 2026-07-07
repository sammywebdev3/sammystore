import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  description: string;
  amount: number;
  status: string;
}

const TransactionSchema: Schema<ITransaction> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, default: 'pending' },
  },
  { timestamps: true }
);

export default (mongoose.models.Transaction as Model<ITransaction>) || mongoose.model<ITransaction>('Transaction', TransactionSchema);
