import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as moment from 'moment';
import * as memoize from 'memoizee';

import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';
import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';

@Injectable()
export class HTTPAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  private base_url: string;
  private memoizedGetClubs: (placeId: string) => Promise<Club[]>;
  private memoizedGetCourts: (clubId: number) => Promise<Court[]>;
  private memoizedGetAvailableSlots: (
    clubId: number,
    courtId: number,
    date: string,
  ) => Promise<Slot[]>;

  constructor(private httpService: HttpService, config: ConfigService) {
    this.base_url = config.get<string>('ATC_BASE_URL', 'http://localhost:4000');
    this.memoizedGetClubs = memoize(this._getClubsUncached.bind(this), {
      promise: true,
      maxAge: 10 * 60 * 1000,
      normalizer: (args) => JSON.stringify(args),
    });

    this.memoizedGetCourts = memoize(this._getCourtsUncached.bind(this), {
      promise: true,
      maxAge: 10 * 60 * 1000,
      normalizer: (args) => JSON.stringify(args),
    });
  
    this.memoizedGetAvailableSlots = memoize(
      this._getAvailableSlotsUncached.bind(this),
      {
        promise: true,
        maxAge: 30 * 1000,
        normalizer: (args) => JSON.stringify(args),
      },
    );
  }

  private async _getClubsUncached(placeId: string): Promise<Club[]> {
    return this.httpService.axiosRef
      .get('clubs', { baseURL: this.base_url, params: { placeId } })
      .then((res) => res.data);
  }

  private async _getCourtsUncached(clubId: number): Promise<Court[]> {
    return this.httpService.axiosRef
      .get(`/clubs/${clubId}/courts`, { baseURL: this.base_url })
      .then((res) => res.data);
  }

  private async _getAvailableSlotsUncached(
    clubId: number,
    courtId: number,
    dateStr: string,
  ): Promise<Slot[]> {
    return this.httpService.axiosRef
      .get(`/clubs/${clubId}/courts/${courtId}/slots`, {
        baseURL: this.base_url,
        params: { date: dateStr },
      })
      .then((res) => res.data);
  }

  async getClubs(placeId: string): Promise<Club[]> {
    return this.memoizedGetClubs(placeId);
  }

  getCourts(clubId: number): Promise<Court[]> {
    return this.memoizedGetCourts(clubId);
  }

  getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    const dateStr = moment(date).format('YYYY-MM-DD');
    return this.memoizedGetAvailableSlots(clubId, courtId, dateStr);
  }

  clearCache(): void {
    (this.memoizedGetClubs as any)?.clear?.();
    (this.memoizedGetCourts as any)?.clear?.();
    (this.memoizedGetAvailableSlots as any)?.clear?.();
  }

  invalidateClubs(placeId?: string): void {
    if (placeId) {
      (this.memoizedGetClubs as any)?.delete?.(placeId);
    } else {
      (this.memoizedGetClubs as any)?.clear?.();
    }
  }

  invalidateCourts(clubId?: number): void {
    if (typeof clubId === 'number') {
      (this.memoizedGetCourts as any)?.delete?.(clubId);
    } else {
      (this.memoizedGetCourts as any)?.clear?.();
    }
  }

  invalidateSlots(
    clubId?: number,
    courtId?: number,
    date?: Date | string,
  ): void {
    if (
      typeof clubId === 'number' &&
      typeof courtId === 'number' &&
      (typeof date === 'string' || date instanceof Date)
    ) {
      const dateStr = typeof date === 'string' ? date : moment(date).format('YYYY-MM-DD');
      (this.memoizedGetAvailableSlots as any)?.delete?.(clubId, courtId, dateStr);
    } else {
      (this.memoizedGetAvailableSlots as any)?.clear?.();
    }
  }
}
