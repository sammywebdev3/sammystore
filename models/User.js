import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
      name: { type: String, required: true },
        walletBalance: { type: Number, default: 0 },
          apiKey: { type: String, unique: true },
            createdAt: { type: Date, default: Date.now }
            });

            UserSchema.pre('save', async function(next) {
              if (!this.isModified('password')) return next();
                const salt = await bcrypt.genSalt(10);
                  this.password = await bcrypt.hash(this.password, salt);
                    next();
                    });

                    UserSchema.methods.comparePassword = async function(candidatePassword) {
                      return await bcrypt.compare(candidatePassword, this.password);
                      };

                      export default mongoose.models.User || mongoose.model('User', UserSchema);