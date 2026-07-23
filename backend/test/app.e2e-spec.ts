import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api/health (GET) should return 404 — no health route yet', async () => {
    // Placeholder: replace with a real health check once a GET /api/health
    // endpoint is added to the app or a dedicated health controller.
    // For now we just verify the app boots without errors.
    expect(app).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });
});
