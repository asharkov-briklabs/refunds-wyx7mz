import AWS from 'aws-sdk'; // aws-sdk ^2.1030.0
import { NotificationMessage, NotificationResult, NotificationStatus } from '../../../common/interfaces/notification.interface';
import { logger } from '../../../common/utils/logger';
import config from '../../../config';
import { InvalidRecipientError } from '../../../common/errors';

/**
 * Email implementation of notification channel for sending email notifications using AWS SES
 */
export default class EmailNotificationChannel {
  private config: any;
  private ses_client: AWS.SES;

  /**
   * Initializes the email notification channel with configuration
   * 
   * @param config - Configuration for the email channel
   */
  constructor(config: any) {
    // Store provided configuration
    this.config = config;
    
    // Initialize AWS SES client with proper region and credentials
    this.ses_client = new AWS.SES({
      region: config.aws.region,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || config.aws.accessKeyId,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || config.aws.secretAccessKey
    });
  }

  /**
   * Sends an email notification to a recipient
   * 
   * @param message - The notification message to send
   * @returns Result of the email delivery attempt
   */
  async send_notification(message: NotificationMessage): Promise<NotificationResult> {
    // Validate recipient email address format
    if (!this.validate_recipient(message.recipient)) {
      logger.error(`Invalid email recipient: ${message.recipient}`);
      throw new InvalidRecipientError(`Invalid email recipient: ${message.recipient}`);
    }
    
    try {
      // Prepare email message with subject, body and HTML content
      const email_message: AWS.SES.Message = {
        Subject: {
          Data: message.subject || '',
          Charset: 'UTF-8'
        },
        Body: {}
      };
      
      // Add plain text body
      if (message.body) {
        email_message.Body.Text = {
          Data: message.body,
          Charset: 'UTF-8'
        };
      }
      
      // Add HTML body if available
      if (message.html_body) {
        email_message.Body.Html = {
          Data: message.html_body,
          Charset: 'UTF-8'
        };
      }
      
      // Send email using SES client
      const response = await this.ses_client.sendEmail({
        Source: this.config.notification.email.sender,
        Destination: {
          ToAddresses: [message.recipient]
        },
        Message: email_message,
        ConfigurationSetName: this.config.notification.email.configurationSet
      }).promise();
      
      // Handle success case by returning appropriate NotificationResult
      logger.info(`Email sent successfully to ${message.recipient}`, {
        notificationId: message.notification_id,
        messageId: response.MessageId
      });
      
      return {
        success: true,
        delivery_status: NotificationStatus.SENT,
        provider_message_id: response.MessageId || null,
        error: null
      };
    } catch (error) {
      // Handle errors by logging and returning error NotificationResult
      logger.error(`Error sending email to ${message.recipient}: ${error.message}`, {
        notificationId: message.notification_id,
        error
      });
      
      return {
        success: false,
        delivery_status: NotificationStatus.FAILED,
        provider_message_id: null,
        error: error.message
      };
    }
  }

  /**
   * Validates if a string is a properly formatted email address
   * 
   * @param recipient - The email address to validate
   * @returns True if recipient is a valid email address, false otherwise
   */
  validate_recipient(recipient: string): boolean {
    // Use regular expression to validate email format
    const email_regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return email_regex.test(recipient);
  }

  /**
   * Gets the delivery status for a specific message ID
   * 
   * @param message_id - The message ID to check status for
   * @returns Current delivery status (SES notifications would be handled separately)
   */
  async get_delivery_status(message_id: string): Promise<string> {
    // Note that SES doesn't provide direct status checking via API
    // Return "UNKNOWN" as status would be updated via webhooks/SNS notifications
    logger.info(`Status check requested for message ID: ${message_id}`);
    return 'UNKNOWN';
  }
}