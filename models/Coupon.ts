import mongoose, { Schema, models, model } from 'mongoose';

const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true }, // percent: 1-100, fixed: NGN amount
    maxDiscount: { type: Number, default: null }, // caps a percent discount, ignored for fixed
    usageLimit: { type: Number, default: null }, // null = unlimited
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 }, // times a single user may redeem this code
    expiresAt: { type: Date, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default models.Coupon || model('Coupon', CouponSchema);
