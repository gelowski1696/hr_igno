import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'igno-hrms-backend',
      timestamp: new Date().toISOString(),
    };
  }
}

