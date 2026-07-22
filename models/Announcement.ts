import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAnnouncement extends Document {
  message: string;
  // info = neutral, warning = heads up, critical = urgent/service-impacting.
  // Purely cosmetic (drives banner color) but lets admins flag severity.
  severity: 'info' | 'warning' | 'critical';
  active: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema: Schema<IAnnouncement> = new Schema(
  {
    message: { type: String, required: true },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
    // Only active announcements are shown site-wide. Kept instead of
    // deleting outright so admins retain a history of past broadcasts.
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default (mongoose.models.Announcement as Model<IAnnouncement>) ||
  mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
