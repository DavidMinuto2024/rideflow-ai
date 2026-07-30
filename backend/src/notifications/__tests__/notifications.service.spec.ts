import { NotificationsService } from '../notifications.service';
import { EmailService } from '../email.service';
import { PushService } from '../push.service';

function createThenable<T>(value: T) {
  const promise = Promise.resolve(value);
  return {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
  };
}

function createQuery(resolveValue: { data: any; error: any }) {
  const thenable = createThenable(resolveValue);
  const query: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnValue(Promise.resolve(resolveValue)),
    maybeSingle: jest.fn().mockReturnValue(Promise.resolve(resolveValue)),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    then: thenable.then,
    catch: thenable.catch,
  };
  return query;
}

describe('NotificationsService & Multichannel (#12)', () => {
  let service: NotificationsService;
  let emailService: EmailService;
  let pushService: PushService;
  let mockSupabase: any;

  beforeEach(() => {
    emailService = new EmailService();
    pushService = new PushService();
    mockSupabase = {
      from: jest.fn(),
      handleError: jest.fn((err: any) => {
        throw new Error(err.message || 'Supabase error');
      }),
    };

    service = new NotificationsService(
      mockSupabase as any,
      emailService,
      pushService,
    );
  });

  describe('EmailService', () => {
    it('dispatches email successfully in dev mode', async () => {
      const result = await emailService.sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        body: 'Test Body',
      });
      expect(result).toBe(true);
    });
  });

  describe('PushService', () => {
    it('dispatches push notification successfully in dev mode', async () => {
      const result = await pushService.sendPush({
        userId: 'user-1',
        title: 'Push Title',
        body: 'Push Body',
      });
      expect(result).toBe(true);
    });
  });

  describe('NotificationsService Multichannel Dispatch', () => {
    // Helper to mock both notifications and preferences tables
    const mockNotificationsAndPrefs = (notifData: any) => {
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'notification_preferences') {
          return createQuery({ data: { email: true, push: true }, error: null });
        }
        if (table === 'notifications') {
          return createQuery({ data: notifData, error: null });
        }
        return createQuery({ data: null, error: null });
      });
    };

    it('creates notification and triggers PushService', async () => {
      const pushSpy = jest.spyOn(pushService, 'sendPush');
      const fakeNotif = {
        id: 'notif-1',
        type: 'RIDE_APPROVED',
        title: 'Ride Approved',
        message: 'Your ride request was approved',
        user_id: 'user-1',
        read: false,
      };

      mockNotificationsAndPrefs(fakeNotif);

      const res = await service.create({
        type: 'RIDE_APPROVED',
        title: 'Ride Approved',
        message: 'Your ride request was approved',
        userId: 'user-1',
      });

      expect(res).toEqual(fakeNotif);
      expect(pushSpy).toHaveBeenCalledWith({
        userId: 'user-1',
        title: 'Ride Approved',
        body: 'Your ride request was approved',
        data: { type: 'RIDE_APPROVED' },
      });
    });

    it('creates pickup time notification and triggers PushService with tripId data', async () => {
      const pushSpy = jest.spyOn(pushService, 'sendPush');
      const fakeNotif = {
        id: 'notif-2',
        type: 'ESTIMATED_PICKUP_TIME',
        title: 'Pickup time updated',
        message: 'Your estimated pickup time has been updated to 09:30:00',
        user_id: 'passenger-1',
      };

      mockNotificationsAndPrefs(fakeNotif);

      const res = await service.createPickupTimeNotification(
        'trip-1',
        'passenger-1',
        new Date('2026-08-01T09:30:00Z'),
      );

      expect(res).toEqual(fakeNotif);
      expect(pushSpy).toHaveBeenCalledWith({
        userId: 'passenger-1',
        title: 'Pickup time updated',
        body: expect.stringContaining('Your estimated pickup time has been updated'),
        data: { type: 'ESTIMATED_PICKUP_TIME', tripId: 'trip-1' },
      });
    });

    it('respects user preferences — does not send push if push=false', async () => {
      const pushSpy = jest.spyOn(pushService, 'sendPush');
      const fakeNotif = {
        id: 'notif-3',
        type: 'RIDE_APPROVED',
        title: 'Ride Approved',
        message: 'Approved',
        user_id: 'user-2',
      };

      // Mock preferences with push=false
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'notification_preferences') {
          return createQuery({ data: { email: true, push: false }, error: null });
        }
        if (table === 'notifications') {
          return createQuery({ data: fakeNotif, error: null });
        }
        return createQuery({ data: null, error: null });
      });

      await service.create({
        type: 'RIDE_APPROVED',
        title: 'Ride Approved',
        message: 'Approved',
        userId: 'user-2',
      });

      expect(pushSpy).not.toHaveBeenCalled();
    });

    it('respects user preferences — does not send email if email=false', async () => {
      const emailSpy = jest.spyOn(emailService, 'sendEmail');
      const fakeNotif = {
        id: 'notif-4',
        type: 'RIDE_APPROVED',
        title: 'Ride Approved',
        message: 'Approved',
        user_id: 'user-3',
      };

      // Mock preferences with email=false
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'notification_preferences') {
          return createQuery({ data: { email: false, push: true }, error: null });
        }
        if (table === 'notifications') {
          return createQuery({ data: fakeNotif, error: null });
        }
        return createQuery({ data: null, error: null });
      });

      await service.create({
        type: 'RIDE_APPROVED',
        title: 'Ride Approved',
        message: 'Approved',
        userId: 'user-3',
        userEmail: 'test@example.com',
      });

      expect(emailSpy).not.toHaveBeenCalled();
    });
  });
});