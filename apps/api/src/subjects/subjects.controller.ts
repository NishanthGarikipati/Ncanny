import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Subject } from '@ncanny/types';
import { Public } from '../common/auth/decorators';
import { SubjectsService } from './subjects.service';

@ApiTags('Subjects')
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List subjects',
    description:
      'The subject catalogue used by registration, profiles and subject networking. Public because it is required before a user has an account.',
  })
  async list(): Promise<Subject[]> {
    return this.subjectsService.list();
  }
}
