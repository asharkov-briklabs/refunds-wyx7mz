// adyen-webhook.handler.ts
import { Request, Response } from 'express'; // express@^4.18.2
import { logger } from '../../../common/utils/logger';
import { eventEmitter } from '../../../common/utils/event-emitter';
import { GatewayType } from '../../../common/enums/gateway-type.enum';
import { RefundStatus } from '../../../common/enums/refund-status.enum';
import { GATEWAY_EVENTS } from '../../../common/constants/event-types';
import { GatewayError } from '../../../common/errors/gateway-error';
import { adyenAdapter } from '../adapters/adyen.adapter';
import config from '../../../config';
import GatewayCredentialManager from '../credential-manager';
import RefundRepository from '../../../database/repositories/refund.repo';
import { injectable } from 'tsyringe'; // tsyringe@^4.7.0
import { metrics } from '../../../common/utils/metrics';
import * as crypto from 'crypto'; // crypto@*

@injectable()
export class AdyenWebhookHandler {
  private readonly refundRepository: RefundRepository;
  private readonly credentialManager: GatewayCredentialManager;

  constructor(refundRepository: RefundRepository) {
    this.refundRepository = refundRepository;
    this.credentialManager = new GatewayCredentialManager();
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    logger.info('Received Adyen webhook', {
      headers: req.headers,
      body: req.body
    });

    eventEmitter.emit(GATEWAY_EVENTS.WEBHOOK_RECEIVED, {
      gateway: GatewayType.ADYEN,
      headers: req.headers,
      body: req.body
    });

    const payload = JSON.stringify(req.body);
    const headers = req.headers;

    try {
      const isValid = await this.validateSignature(payload, headers);

      if (!isValid) {
        logger.warn('Invalid Adyen webhook signature');
        res.status(401).send('Unauthorized');
        return;
      }

      const notificationData = adyenAdapter.parseWebhookEvent(payload);

      const processingResult = await this.processNotification(notificationData);

      if (processingResult) {
        res.status(200).send('[accepted]'); // Adyen requires this exact response
        metrics.incrementCounter('adyen_webhook.success', 1);
      } else {
        logger.warn('Adyen webhook processing failed');
        res.status(500).send('Internal Server Error');
        metrics.incrementCounter('adyen_webhook.failure', 1);
      }
    } catch (error) {
      logger.error('Error handling Adyen webhook', { error });
      res.status(500).send('Internal Server Error');
      metrics.incrementCounter('adyen_webhook.error', 1);
    }
  }

  async validateSignature(payload: string, headers: any): Promise<boolean> {
    try {
      const hmacKey = await this.credentialManager.getWebhookSecret(GatewayType.ADYEN);
      const signature = headers['x-hmac-signature'] as string;

      const isValid = adyenAdapter.validateWebhookSignature(payload, signature, hmacKey);

      if (!isValid) {
        logger.warn('Invalid Adyen webhook signature detected', {
          signatureProvided: signature
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Error validating Adyen webhook signature', { error });
      return false;
    }
  }

  async processNotification(notificationData: any): Promise<boolean> {
    try {
      if (!notificationData || !notificationData.events || !Array.isArray(notificationData.events)) {
        logger.error('Invalid notification data format');
        return false;
      }

      for (const event of notificationData.events) {
        if (event.type === 'REFUND_COMPLETED' || event.type === 'REFUND_FAILED') {
          const refundData = {
            gatewayReference: event.gatewayRefundId,
            status: event.status,
            amount: event.amount,
            currency: event.currency,
            processingDate: event.processingDate,
            reason: event.reason,
            rawData: event.rawData
          };
          await this.processRefundNotification(refundData);
        } else {
          logger.info('Received non-refund related Adyen webhook event', { event });
        }
      }
      return true;
    } catch (error) {
      logger.error('Error processing Adyen notification', { error });
      return false;
    }
  }

  async processRefundNotification(refundData: any): Promise<boolean> {
    try {
      const refundId = refundData.gatewayReference;
      const refund = await this.refundRepository.findById(refundId);

      if (!refund) {
        logger.error('Refund not found for gateway reference', { refundId });
        return false;
      }

      const newStatus = this.mapAdyenStatusToInternal(refundData.status);

      logger.info('Updating refund status from Adyen webhook', {
        refundId: refund.refundId,
        gatewayReference: refundData.gatewayReference,
        newStatus
      });

      await this.refundRepository.updateStatus(refund.refundId, newStatus, {
        gatewayReference: refundData.gatewayReference,
        gatewayData: refundData.rawData
      });

      eventEmitter.emit(GATEWAY_EVENTS.STATUS_UPDATED, {
        refundId: refund.refundId,
        gateway: GatewayType.ADYEN,
        status: newStatus
      });

      return true;
    } catch (error) {
      logger.error('Error processing Adyen refund notification', { error });
      return false;
    }
  }

  mapAdyenStatusToInternal(adyenStatus: string): RefundStatus {
    switch (adyenStatus) {
      case 'completed':
        return RefundStatus.COMPLETED;
      case 'failed':
        return RefundStatus.FAILED;
      case 'pending':
        return RefundStatus.GATEWAY_PENDING;
      default:
        logger.warn('Unknown Adyen status', { adyenStatus });
        return RefundStatus.GATEWAY_PENDING;
    }
  }
}

function mapAdyenEventToInternalEvent(adyenEventType: string): string | null {
  const eventMap: { [key: string]: string } = {
    'REFUND': 'REFUND_COMPLETED',
    'REFUND_FAILED': 'REFUND_FAILED'
  };

  if (adyenEventType in eventMap) {
    return eventMap[adyenEventType];
  }

  return null;
}

function extractRefundDataFromNotification(notification: any): any | null {
  if (!notification || !notification.NotificationRequestItem) {
    return null;
  }

  const item = notification.NotificationRequestItem;

  if (item.eventCode !== 'REFUND' && item.eventCode !== 'REFUND_FAILED') {
    return null;
  }

  const pspReference = item.pspReference;
  const merchantReference = item.merchantReference;
  const amount = item.amount.value;
  const currency = item.amount.currency;
  const status = item.success ? 'completed' : 'failed';

  return {
    pspReference,
    merchantReference,
    amount,
    currency,
    status
  };
}

export { mapAdyenEventToInternalEvent };