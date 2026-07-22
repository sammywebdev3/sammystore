import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITicketMessage {
  sender: 'user' | 'admin';
  message: string;
  attachmentUrl?: string;
  createdAt: Date;
}

export interface ITicket extends Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  status: 'open' | 'pending' | 'closed';
  messages: ITicketMessage[];
  adminUnread: boolean;
  userUnread: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TicketMessageSchema = new Schema<ITicketMessage>(
  {
    sender: { type: String, enum: ['user', 'admin'], required: true },
    message: { type: String, required: true },
    // Optional payment-proof screenshot, stored as a base64 data URI.
    // Kept small (client enforces a size cap) since it lives inline on
    // the document rather than in separate file storage.
    attachmentUrl: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const TicketSchema: Schema<ITicket> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    // "pending" = awaiting admin reply, "open" = admin replied and it's
    // awaiting the customer, "closed" = resolved. Kept distinct from
    // "open" so admins can filter for what actually needs their attention.
    status: { type: String, enum: ['open', 'pending', 'closed'], default: 'pending' },
    messages: { type: [TicketMessageSchema], default: [] },
    // adminUnread: true whenever the customer has sent something the admin
    // hasn't seen yet (new ticket or new user reply). userUnread: true
    // whenever the admin has replied and the customer hasn't opened the
    // thread since. Kept separate from status since status also drives
    // filtering/reporting and shouldn't double as a read receipt.
    adminUnread: { type: Boolean, default: true },
    userUnread: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default (mongoose.models.Ticket as Model<ITicket>) || mongoose.model<ITicket>('Ticket', TicketSchema);
