import mongoose, { Schema, model, Document } from 'mongoose';
import { 
  Notification, 
  NotificationType, 
  NotificationChannel, 
  NotificationStatus 
} from '../../common/interfaces/notification.interface';

/**
 * Interface for Notification documents in MongoDB
 * Extends both Mongoose Document and our Notification interface
 */
export interface INotificationDocument extends Document, Notification {}

/**
 * MongoDB Schema for notifications
 * Stores all notification records across multiple channels (email, SMS, in-app)
 * for events such as refund status changes, approval requests, and compliance violations
 */
export const notificationSchema = new Schema({
  notification_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  notification_type: {
    type: String,
    required: true,
    enum: Object.values(NotificationType),
    index: true
  },
  channel: {
    type: String,
    required: true,
    enum: Object.values(NotificationChannel)
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(NotificationStatus),
    index: true
  },
  subject: {
    type: String,
    default: null
  },
  body: {
    type: String,
    required: true
  },
  scheduled_time: {
    type: Date,
    default: null,
    index: true
  },
  sent_time: {
    type: Date,
    default: null
  },
  delivery_status: {
    type: String,
    enum: Object.values(NotificationStatus),
    default: null
  },
  delivery_details: {
    type: Schema.Types.Mixed,
    default: null
  },
  context: {
    type: Schema.Types.Mixed,
    default: null
  },
  read_at: {
    type: Date,
    default: null,
    index: true
  },
  reference_id: {
    type: String,
    default: null,
    index: true
  },
  reference_type: {
    type: String,
    default: null,
    index: true
  },
  created_at: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  }
}, {
  // Don't use Mongoose's built-in timestamps
  timestamps: false,
  
  // Collection name in MongoDB
  collection: 'notifications',
  
  // Allow virtual getters to be included in toJSON output
  toJSON: { 
    virtuals: true,
    getters: true,
    versionKey: false,
    transform: (doc, ret) => {
      delete ret._id; // Remove the _id field from the output
      return ret;
    }
  }
});

// Create compound indexes for common query patterns
notificationSchema.index({ user_id: 1, created_at: -1 }); // For user notification history
notificationSchema.index({ status: 1, scheduled_time: 1 }); // For finding pending notifications to send
notificationSchema.index({ reference_id: 1, reference_type: 1 }); // For looking up notifications by reference

// Create a TTL index to automatically remove old notifications after 6 months (180 days)
notificationSchema.index({ created_at: 1 }, { expireAfterSeconds: 15552000 });

// Create and export the Mongoose model
export const NotificationModel = model<INotificationDocument>('Notification', notificationSchema);