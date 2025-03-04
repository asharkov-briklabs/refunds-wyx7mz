import * as AWS from 'aws-sdk'; // aws-sdk ^2.1030.0
import { 
  NotificationMessage, 
  NotificationResult, 
  NotificationStatus 
} from '../../../common/interfaces/notification.interface';
import { logger } from '../../../common/utils/logger';
import config from '../../../config';
import { InvalidRecipientError } from '../../../common/errors';

/**
 * SMS implementation of notification channel for sending text message notifications
 * using AWS SNS
 */
class SMSNotificationChannel {
  /**
   * Configuration object for the SMS channel
   */
  private config: any;
  
  /**
   * SNS client for sending SMS messages
   */
  private sns_client: AWS.SNS;

  /**
   * Initializes the SMS notification channel with configuration
   * 
   * @param config - Configuration object containing SMS settings
   */
  constructor(config: any) {
    this.config = config;
    
    // Initialize AWS SNS client with proper region and credentials
    this.sns_client = new AWS.SNS({
      region: config.aws.region,
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
      apiVersion: '2010-03-31'
    });
  }

  /**
   * Sends an SMS notification to a recipient
   * 
   * @param message - The notification message to send
   * @returns Promise resolving to a NotificationResult indicating success or failure
   */
  async send_notification(message: NotificationMessage): Promise<NotificationResult> {
    // Validate recipient phone number format
    if (!this.validate_recipient(message.recipient)) {
      logger.error(`Invalid phone number format: ${message.recipient}`);
      throw new InvalidRecipientError(`Invalid phone number format: ${message.recipient}`);
    }

    // Format message body to fit SMS character limits
    const formattedBody = this.format_sms_body(message.body);

    try {
      // Prepare SNS parameters for sending SMS
      const params: AWS.SNS.PublishInput = {
        Message: formattedBody,
        PhoneNumber: message.recipient,
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: this.config.notification?.sms?.senderId || 'BRIK'
          },
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional' // Use Transactional for higher delivery priority
          }
        }
      };

      // Send the SMS using SNS
      const response = await this.sns_client.publish(params).promise();
      
      logger.info(`SMS notification sent successfully`, {
        phoneNumber: message.recipient,
        messageId: response.MessageId,
        notificationId: message.notification_id
      });

      // Return successful result
      return {
        success: true,
        delivery_status: NotificationStatus.SENT,
        provider_message_id: response.MessageId || null,
        error: null
      };
    } catch (error) {
      // Log error details
      logger.error(`Error sending SMS to ${message.recipient}`, {
        error: error.message, 
        code: error.code,
        notificationId: message.notification_id
      });

      // Return error result
      return {
        success: false,
        delivery_status: NotificationStatus.FAILED,
        provider_message_id: null,
        error: error.message
      };
    }
  }

  /**
   * Validates if a string is a properly formatted phone number
   * 
   * @param recipient - The phone number to validate
   * @returns True if recipient is a valid phone number, false otherwise
   */
  validate_recipient(recipient: string): boolean {
    // Use regular expression to validate international phone number format
    // Uses E.164 format validation: +[country code][number]
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(recipient);
  }

  /**
   * Gets the delivery status for a specific message ID
   * 
   * @param message_id - The provider message ID to check
   * @returns Promise resolving to the current delivery status
   */
  async get_delivery_status(message_id: string): Promise<string> {
    // SNS doesn't provide direct status checking via API
    // Status would be updated via webhooks/SNS notifications
    logger.info(`SMS delivery status check requested for message ID: ${message_id}`);
    
    // Always return UNKNOWN as SMS delivery status would be handled by webhooks
    return 'UNKNOWN';
  }

  /**
   * Formats the message body to fit within SMS character limits
   * 
   * @param body - The original message body
   * @returns Formatted message body suitable for SMS
   */
  private format_sms_body(body: string): string {
    // SMS typically has a 160 character limit for standard encoding
    const MAX_SMS_LENGTH = 160;
    
    // Remove excessive whitespace
    let formattedBody = body.trim().replace(/\s+/g, ' ');
    
    // Truncate if necessary and add ellipsis
    if (formattedBody.length > MAX_SMS_LENGTH) {
      formattedBody = formattedBody.substring(0, MAX_SMS_LENGTH - 3) + '...';
    }
    
    return formattedBody;
  }
}

export default SMSNotificationChannel;