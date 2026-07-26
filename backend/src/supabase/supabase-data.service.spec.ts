import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseDataService } from './supabase-data.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('SupabaseDataService', () => {
  let service: SupabaseDataService;
  let configService: ConfigService;

  const mockSupabaseUrl = 'https://test-project.supabase.co';
  const mockServiceRoleKey = 'test-service-role-key';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseDataService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === 'SUPABASE_URL') return mockSupabaseUrl;
              if (key === 'SUPABASE_SERVICE_ROLE_KEY') return mockServiceRoleKey;
              throw new Error(`Missing env var: ${key}`);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SupabaseDataService>(SupabaseDataService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should expose a supabase client instance', () => {
    expect(service.client).toBeDefined();
  });

  it('should expose a from() method that returns a query builder', () => {
    const qb = service.from('events');
    expect(qb).toBeDefined();
    expect(typeof qb.select).toBe('function');
  });

  describe('handleError', () => {
    it('should throw NotFoundException for PGRST116 (row not found)', () => {
      const error = { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' };
      expect(() => service.handleError(error, 'events')).toThrow(NotFoundException);
      expect(() => service.handleError(error, 'events')).toThrow('Resource not found for events');
    });

    it('should throw ConflictException for 23505 (unique violation)', () => {
      const error = { code: '23505', message: 'duplicate key value violates unique constraint' };
      expect(() => service.handleError(error, 'users')).toThrow(ConflictException);
      expect(() => service.handleError(error, 'users')).toThrow('Resource already exists for users');
    });

    it('should throw BadRequestException for 23503 (foreign key violation)', () => {
      const error = { code: '23503', message: 'insert or update on table violates foreign key constraint' };
      expect(() => service.handleError(error, 'rides')).toThrow(BadRequestException);
      expect(() => service.handleError(error, 'rides')).toThrow('Referenced resource does not exist for rides');
    });

    it('should throw ServiceUnavailableException for network errors', () => {
      const error = { message: 'fetch failed: connect ECONNREFUSED' };
      expect(() => service.handleError(error)).toThrow(ServiceUnavailableException);
      expect(() => service.handleError(error)).toThrow('Database service unreachable');
    });

    it('should throw ServiceUnavailableException for timeout errors', () => {
      const error = { message: 'request timed out after 30000ms' };
      expect(() => service.handleError(error)).toThrow(ServiceUnavailableException);
    });

    it('should throw UnauthorizedException for 401 errors', () => {
      const error = { code: '401', message: 'Invalid API key' };
      expect(() => service.handleError(error)).toThrow(UnauthorizedException);
    });

    it('should throw InternalServerErrorException for unknown errors', () => {
      const error = { code: 'XX000', message: 'internal error' };
      expect(() => service.handleError(error)).toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException for undefined_table (42P01)', () => {
      const error = { code: '42P01', message: 'relation "unknown_table" does not exist' };
      expect(() => service.handleError(error, 'unknown_table')).toThrow(InternalServerErrorException);
    });

    it('should handle null/undefined error gracefully', () => {
      expect(() => service.handleError(null)).toThrow(InternalServerErrorException);
      expect(() => service.handleError(undefined)).toThrow(InternalServerErrorException);
    });
  });
});
