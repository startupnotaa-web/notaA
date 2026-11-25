import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingRepositoryDrizzle } from './onboarding.repository.drizzle';
import { OnboardingService } from './onboarding.service';
import { ONBOARDING_REPOSITORY } from './onboarding.tokens';

@Module({
  controllers: [OnboardingController],
  providers: [
    OnboardingService,
    { provide: ONBOARDING_REPOSITORY, useClass: OnboardingRepositoryDrizzle },
  ],
})
export class OnboardingModule {}
