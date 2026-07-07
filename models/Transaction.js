import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
        type: String, 
            enum: ['number_rental', 'vtu', 'smm', 'account_purchase', 'wallet_fund'], 
                required: true 
                  },
                    description: { type: String, required: true },
                      amount: { type: Number, required: true },
                        status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
                          metadata: { type: Object },
                            createdAt: { type: Date, default: Date.now }
                            });

                            export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);