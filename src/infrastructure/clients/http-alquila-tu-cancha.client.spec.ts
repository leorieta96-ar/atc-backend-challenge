import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import * as moment from 'moment';

import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';
import { HTTPAlquilaTuCanchaClient } from './http-alquila-tu-cancha.client';

const mockHttpService = {
  axiosRef: {
    get: jest.fn(),
  },
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('http://fake-atc-url'),
};

describe('HTTPAlquilaTuCanchaClient', () => {
  let client: HTTPAlquilaTuCanchaClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HTTPAlquilaTuCanchaClient,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    client = module.get<HTTPAlquilaTuCanchaClient>(HTTPAlquilaTuCanchaClient);

    jest.clearAllMocks();
    client.clearCache();
  });

  it('should be defined', () => {
    expect(client).toBeDefined();
  });

  describe('getClubs', () => {
    it('should call the correct endpoint and return clubs', async () => {
      const placeId = 'some-place-id';
      const clubs: Club[] = [{ id: 1, name: 'Club 1' } as Club];
      const response: AxiosResponse = {
        data: clubs,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      mockHttpService.axiosRef.get.mockResolvedValue(response);

      const result = await client.getClubs(placeId);

      expect(result).toEqual(clubs);
      expect(mockHttpService.axiosRef.get).toHaveBeenCalledWith('clubs', {
        baseURL: 'http://fake-atc-url',
        params: { placeId },
      });
    });

    it('should use cache for subsequent calls to getClubs', async () => {
      const placeId = 'some-place-id';
      const clubs: Club[] = [{ id: 1, name: 'Club 1' } as Club];
      const response: AxiosResponse = {
        data: clubs,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      mockHttpService.axiosRef.get.mockResolvedValue(response);

      await client.getClubs(placeId);
      await client.getClubs(placeId);

      expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCourts', () => {
    it('should call the correct endpoint and return courts', async () => {
      const clubId = 1;
      const courts: Court[] = [{ id: 1, name: 'Court 1' } as Court];
      const response: AxiosResponse = {
        data: courts,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      mockHttpService.axiosRef.get.mockResolvedValue(response);

      const result = await client.getCourts(clubId);

      expect(result).toEqual(courts);
      expect(mockHttpService.axiosRef.get).toHaveBeenCalledWith(
        `/clubs/${clubId}/courts`,
        { baseURL: 'http://fake-atc-url' },
      );
    });

    it('should use cache for subsequent calls to getCourts', async () => {
      const clubId = 1;
      const courts: Court[] = [{ id: 1, name: 'Court 1' } as Court];
      const response: AxiosResponse = {
        data: courts,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      mockHttpService.axiosRef.get.mockResolvedValue(response);

      await client.getCourts(clubId);
      await client.getCourts(clubId);

      expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAvailableSlots', () => {
    it('should call the correct endpoint and return slots', async () => {
      const clubId = 1;
      const courtId = 1;
      const date = new Date('2023-01-01T12:00:00Z');
      const dateStr = moment(date).format('YYYY-MM-DD');
      const slots: Slot[] = [{ start: '10:00' } as Slot];
      const response: AxiosResponse = {
        data: slots,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      mockHttpService.axiosRef.get.mockResolvedValue(response);

      const result = await client.getAvailableSlots(clubId, courtId, date);

      expect(result).toEqual(slots);
      expect(mockHttpService.axiosRef.get).toHaveBeenCalledWith(
        `/clubs/${clubId}/courts/${courtId}/slots`,
        {
          baseURL: 'http://fake-atc-url',
          params: { date: dateStr },
        },
      );
    });

    it('should use cache for subsequent calls to getAvailableSlots', async () => {
      const clubId = 1;
      const courtId = 1;
      const date = new Date('2023-01-01T12:00:00Z');
      const slots: Slot[] = [{ start: '10:00' } as Slot];
      const response: AxiosResponse = {
        data: slots,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      mockHttpService.axiosRef.get.mockResolvedValue(response);

      await client.getAvailableSlots(clubId, courtId, date);
      await client.getAvailableSlots(clubId, courtId, date);

      expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Invalidation', () => {
    beforeEach(() => {
      const response: AxiosResponse = {
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };
      mockHttpService.axiosRef.get.mockResolvedValue(response);
    });

    describe('invalidateClubs', () => {
      it('should invalidate a specific club cache', async () => {
        const placeId1 = 'place-1';
        const placeId2 = 'place-2';

        await client.getClubs(placeId1);
        await client.getClubs(placeId2);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(2);

        client.invalidateClubs(placeId1);

        await client.getClubs(placeId1);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(3);

        await client.getClubs(placeId2);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(3);
      });

      it('should invalidate all clubs cache if no placeId is provided', async () => {
        const placeId1 = 'place-1';
        const placeId2 = 'place-2';

        await client.getClubs(placeId1);
        await client.getClubs(placeId2);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(2);

        client.invalidateClubs();

        await client.getClubs(placeId1);
        await client.getClubs(placeId2);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(4);
      });
    });

    describe('invalidateCourts', () => {
      it('should invalidate a specific court cache', async () => {
        const clubId1 = 1;
        const clubId2 = 2;

        await client.getCourts(clubId1);
        await client.getCourts(clubId2);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(2);

        client.invalidateCourts(clubId1);

        await client.getCourts(clubId1);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(3);

        await client.getCourts(clubId2);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(3);
      });

      it('should invalidate all courts cache if no clubId is provided', async () => {
        const clubId1 = 1;
        const clubId2 = 2;

        await client.getCourts(clubId1);
        await client.getCourts(clubId2);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(2);

        client.invalidateCourts();

        await client.getCourts(clubId1);
        await client.getCourts(clubId2);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(4);
      });
    });

    describe('invalidateSlots', () => {
      const clubId = 1;
      const courtId = 1;
      const date = new Date('2023-01-01');
      const dateStr = '2023-01-01';

      it('should invalidate a specific slot cache using Date object', async () => {
        await client.getAvailableSlots(clubId, courtId, date);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(1);

        client.invalidateSlots(clubId, courtId, date);

        await client.getAvailableSlots(clubId, courtId, date);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(2);
      });

      it('should invalidate all slots cache if no arguments are provided', async () => {
        const clubId2 = 2;
        const courtId2 = 2;
        const date2 = new Date('2023-01-02');

        await client.getAvailableSlots(clubId, courtId, date);
        await client.getAvailableSlots(clubId2, courtId2, date2);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(2);

        client.invalidateSlots();

        await client.getAvailableSlots(clubId, courtId, date);
        await client.getAvailableSlots(clubId2, courtId2, date2);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(4);
      });

      it('should clear all slots cache if arguments are incomplete', async () => {
        await client.getAvailableSlots(clubId, courtId, date);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(1);

        client.invalidateSlots(clubId, courtId);

        await client.getAvailableSlots(clubId, courtId, date);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(2);
      });
    });

    describe('clearCache', () => {
      it('should clear all caches', async () => {
        const placeId = 'place-1';
        const clubId = 1;
        const courtId = 1;
        const date = new Date('2023-01-01');

        await client.getClubs(placeId);
        await client.getCourts(clubId);
        await client.getAvailableSlots(clubId, courtId, date);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(3);
       
        client.clearCache();
       
        await client.getClubs(placeId);
        await client.getCourts(clubId);
        await client.getAvailableSlots(clubId, courtId, date);
        expect(mockHttpService.axiosRef.get).toHaveBeenCalledTimes(6);
      });
    });
  });
});
