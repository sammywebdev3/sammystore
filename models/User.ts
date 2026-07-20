import mongoose, { Schema, Document, Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  apiKey: string;
  walletBalance: number;
  suspended: boolean;
  suspendReason?: string;
  referralCode: string;
  referredBy?: mongoose.Types.ObjectId;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    apiKey: { type: String, default: '' },
    walletBalance: { type: Number, default: 0 },
    suspended: { type: Boolean, default: false },
    suspendReason: { type: String, default: '' },
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    twoFactorSecret: { type: String, default: null },
    twoFactorEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Plain async hook (no `next` callback needed - Mongoose supports this
// directly) so the password is hashed exactly once, right before saving,
// no matter which route creates or updates the user. Callers should always
// pass a PLAIN TEXT password and let this hook hash it - hashing it again
// before calling .create()/.save() would double-hash it and break login.
UserSchema.pre('save', async function () {
  if (!this.referralCode) {
    // Short, URL-friendly code generated once per user - collisions are
    // astronomically unlikely at this length but the unique index will
    // reject a duplicate insert if it ever happens.
    this.referralCode = require('crypto').randomBytes(4).toString('hex');
  }
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
