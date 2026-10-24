import { Module } from '@nestjs/common';
import { LeadRepositoryDb, type Database } from '@notaa/db';
import { DB_CLIENT } from '../../db/db.tokens';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { LEAD_REPOSITORY } from './lead.tokens';

@Module({
  controllers: [LeadController],
  providers: [
    LeadService,
    { provide: LEAD_REPOSITORY, useFactory: (db: Database) => new LeadRepositoryDb(db), inject: [DB_CLIENT] },
  ],
})
export class LeadModule {}
