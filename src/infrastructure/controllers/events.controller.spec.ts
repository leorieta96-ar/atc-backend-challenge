import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import * as moment from 'moment';

import { EventsController, ExternalEventDTO } from './events.controller';
import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../../domain/ports/aquila-tu-cancha.client';
import { SlotBookedEvent } from '../../domain/events/slot-booked.event';
import { SlotAvailableEvent } from '../../domain/events/slot-cancelled.event';
import { ClubUpdatedEvent } from '../../domain/events/club-updated.event';
import { CourtUpdatedEvent } from '../../domain/events/court-updated.event';

const mockEventBus = {
  publish: jest.fn(),
};

const mockAlquilaClient = {
  invalidateSlots: jest.fn(),
  invalidateCourts: jest.fn(),
};

describe('EventsController', () => {
  let controller: EventsController;
  let eventBus: EventBus;
  let alquilaClient: AlquilaTuCanchaClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
        {
          provide: ALQUILA_TU_CANCHA_CLIENT,
          useValue: mockAlquilaClient,
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    eventBus = module.get<EventBus>(EventBus);
    alquilaClient = module.get<AlquilaTuCanchaClient>(ALQUILA_TU_CANCHA_CLIENT);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('receiveEvent', () => {
    const mockSlot = {
      price: 20,
      duration: 60,
      datetime: '2023-12-01T14:00:00.000Z',
      start: '14:00',
      end: '15:00',
      _priority: 1,
    };

    it('should handle "booking_created" event', async () => {
      const event: ExternalEventDTO = {
        type: 'booking_created',
        clubId: 1,
        courtId: 10,
        slot: mockSlot,
      };

      await controller.receiveEvent(event);

      expect(eventBus.publish).toHaveBeenCalledWith(
        new SlotBookedEvent(event.clubId, event.courtId, event.slot),
      );
      expect(alquilaClient.invalidateSlots).toHaveBeenCalledWith(
        event.clubId,
        event.courtId,
        moment(event.slot.datetime).format('YYYY-MM-DD'),
      );
    });

    it('should handle "booking_cancelled" event', async () => {
      const event: ExternalEventDTO = {
        type: 'booking_cancelled',
        clubId: 2,
        courtId: 20,
        slot: mockSlot,
      };

      await controller.receiveEvent(event);

      expect(eventBus.publish).toHaveBeenCalledWith(
        new SlotAvailableEvent(event.clubId, event.courtId, event.slot),
      );
      expect(alquilaClient.invalidateSlots).toHaveBeenCalledWith(
        event.clubId,
        event.courtId,
        moment(event.slot.datetime).format('YYYY-MM-DD'),
      );
    });

    it('should handle "club_updated" event', async () => {
      const event: ExternalEventDTO = {
        type: 'club_updated',
        clubId: 3,
        fields: ['attributes', 'openhours'],
      };

      await controller.receiveEvent(event);

      expect(eventBus.publish).toHaveBeenCalledWith(
        new ClubUpdatedEvent(event.clubId, event.fields),
      );
      expect(alquilaClient.invalidateCourts).toHaveBeenCalledWith(event.clubId);
      expect(alquilaClient.invalidateSlots).toHaveBeenCalledWith();
    });

    it('should handle "court_updated" event', async () => {
      const event: ExternalEventDTO = {
        type: 'court_updated',
        clubId: 4,
        courtId: 40,
        fields: ['name'],
      };

      await controller.receiveEvent(event);

      expect(eventBus.publish).toHaveBeenCalledWith(
        new CourtUpdatedEvent(event.clubId, event.courtId, event.fields),
      );
      expect(alquilaClient.invalidateCourts).toHaveBeenCalledWith(event.clubId);
      expect(alquilaClient.invalidateSlots).toHaveBeenCalledWith();
    });
  });
});
