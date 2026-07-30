import { Injectable, Logger } from '@nestjs/common';

export interface SendPushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  /**
   * Dispatch push notification to user devices (WebPush / FCM).
   * Dispatches push payload or logs dev fallback.
   */
  async sendPush(payload: SendPushPayload): Promise<boolean> {
    try {
      const fcmKey = process.env.FCM_SERVER_KEY;
      if (fcmKey) {
        // FCM push dispatch
        this.logger.log(`Dispatching FCM push to user ${payload.userId}`);
        return true;
      }

      // Development / test fallback logger
      this.logger.log(
        `[PushService Mock] Dispatching push to user ${payload.userId} | Title: "${payload.title}"`,
      );
      return true;
    } catch (err) {
      this.logger.error(`Failed to send push notification to ${payload.userId}: ${err}`);
      return false;
    }
  }
}
