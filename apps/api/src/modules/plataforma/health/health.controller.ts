import { Controller, Get } from '@nestjs/common';
import { Public } from '../../../common/decorators/acesso';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'ok' };
  }
}
