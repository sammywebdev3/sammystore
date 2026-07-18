import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITicketMessage {
  sender: 'user' | 'admin';
  message: string;
  createdAt: Date;
}

export interface ITicket extends Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  status: 'open' | 'pending' | 'closed';
  messages: ITicketMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const TicketMessageSchema = new Schema<ITicketMessage>(
  {
    sender: { type: String, enum: ['user', 'admin'], required: true },
    message: { type: String, required: true },
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
  },
  { timestamps: true }
);

export default (mongoose.models.Ticket as Model<ITicket>) || mongoose.model<ITicket>('Ticket', TicketSchema);
