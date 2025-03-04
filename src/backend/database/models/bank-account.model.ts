import mongoose, { Schema, Document, Model } from 'mongoose'; // mongoose ^6.0.0
import { v4 as uuid } from 'uuid'; // uuid ^9.0.0

import { 
  BankAccountType, 
  BankAccountStatus, 
  BankAccountVerificationStatus, 
  BankAccountVerificationMethod 
} from '../../common/interfaces/bank-account.interface';
import { hashData } from '../../common/utils/encryption-utils';

/**
 * Interface defining the structure of a bank account
 */
export interface IBankAccount {
  /** Unique identifier for the bank account */
  accountId: string;
  
  /** ID of the merchant who owns this bank account */
  merchantId: string;
  
  /** Name of the account holder */
  accountHolderName: string;
  
  /** Type of bank account (checking or savings) */
  accountType: BankAccountType;
  
  /** Bank routing number */
  routingNumber: string;
  
  /** Hashed account number for lookup and duplicate prevention */
  accountNumberHash: string;
  
  /** Encrypted account number (for secure storage) */
  accountNumberEncrypted: string;
  
  /** Last 4 digits of the account number (for display purposes) */
  accountNumberLast4: string;
  
  /** ID of the encryption key used to encrypt the account number */
  encryptionKeyId: string;
  
  /** Current status of the bank account */
  status: BankAccountStatus;
  
  /** Current verification status of the bank account */
  verificationStatus: BankAccountVerificationStatus;
  
  /** Method used for verification */
  verificationMethod?: BankAccountVerificationMethod;
  
  /** Whether this is the default account for refunds */
  isDefault: boolean;
  
  /** When the account was created */
  createdAt: Date;
  
  /** When the account was last updated */
  updatedAt: Date;
}

/**
 * Interface extending IBankAccount with Mongoose Document properties and methods
 */
export interface IBankAccountDocument extends IBankAccount, Document {
  /**
   * Checks if the bank account is verified
   * @returns Whether the account is verified
   */
  isVerified(): boolean;
  
  /**
   * Checks if the bank account can receive refunds
   * @returns Whether the account can receive refunds
   */
  canReceiveRefunds(): boolean;
  
  /**
   * Returns a masked version of the account number
   * @returns Masked account number showing only the last 4 digits
   */
  maskAccountNumber(): string;
}

/**
 * Mongoose schema for bank account documents
 */
export const bankAccountSchema = new Schema<IBankAccountDocument>(
  {
    accountId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => `acct_${uuid().replace(/-/g, '')}`
    },
    merchantId: {
      type: String,
      required: true,
      index: true
    },
    accountHolderName: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 100
    },
    accountType: {
      type: String,
      required: true,
      enum: Object.values(BankAccountType)
    },
    routingNumber: {
      type: String,
      required: true,
      match: /^\d{9}$/ // US routing numbers are 9 digits
    },
    accountNumberHash: {
      type: String,
      required: true,
      index: true
    },
    accountNumberEncrypted: {
      type: String,
      required: true
    },
    accountNumberLast4: {
      type: String,
      required: true,
      match: /^\d{4}$/ // Last 4 digits of account number
    },
    encryptionKeyId: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(BankAccountStatus),
      default: BankAccountStatus.ACTIVE,
      index: true
    },
    verificationStatus: {
      type: String,
      required: true,
      enum: Object.values(BankAccountVerificationStatus),
      default: BankAccountVerificationStatus.UNVERIFIED,
      index: true
    },
    verificationMethod: {
      type: String,
      required: false,
      enum: Object.values(BankAccountVerificationMethod)
    },
    isDefault: {
      type: Boolean,
      required: true,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'bank_accounts',
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        // Remove sensitive data and internal fields when converting to JSON
        delete ret._id;
        delete ret.__v;
        delete ret.accountNumberEncrypted;
        delete ret.accountNumberHash;
        delete ret.encryptionKeyId;
        return ret;
      }
    },
    toObject: {
      virtuals: true
    }
  }
);

// Create additional indexes for optimized queries
bankAccountSchema.index({ accountId: 1 }, { unique: true });
bankAccountSchema.index({ merchantId: 1, isDefault: 1 });
bankAccountSchema.index({ accountNumberHash: 1 });
bankAccountSchema.index({ status: 1, verificationStatus: 1 });

// Instance methods
bankAccountSchema.methods.isVerified = function(): boolean {
  return this.verificationStatus === BankAccountVerificationStatus.VERIFIED;
};

bankAccountSchema.methods.canReceiveRefunds = function(): boolean {
  return this.status === BankAccountStatus.ACTIVE && 
         this.verificationStatus === BankAccountVerificationStatus.VERIFIED;
};

bankAccountSchema.methods.maskAccountNumber = function(): string {
  return `****${this.accountNumberLast4}`;
};

// Static methods
bankAccountSchema.statics.findByAccountId = function(accountId: string): Promise<IBankAccountDocument | null> {
  return this.findOne({ accountId });
};

bankAccountSchema.statics.findByMerchantId = function(merchantId: string): Promise<IBankAccountDocument[]> {
  return this.find({ merchantId }).sort({ isDefault: -1, createdAt: -1 });
};

bankAccountSchema.statics.findDefaultForMerchant = function(merchantId: string): Promise<IBankAccountDocument | null> {
  return this.findOne({ merchantId, isDefault: true });
};

bankAccountSchema.statics.findByAccountNumberHash = function(accountNumberHash: string): Promise<IBankAccountDocument | null> {
  return this.findOne({ accountNumberHash });
};

/**
 * Mongoose model for bank account documents
 */
export const BankAccountModel: Model<IBankAccountDocument> = mongoose.model<IBankAccountDocument>(
  'BankAccount',
  bankAccountSchema
);