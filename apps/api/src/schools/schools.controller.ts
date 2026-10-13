import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { schoolSearchSchema, type SchoolSearchInput } from '@ncanny/validation';
import type { PaginatedResult, SchoolSummary } from '@ncanny/types';
import { Public } from '../common/auth/decorators';
import { ApiErrorResponse, ApiZodQuery } from '../common/swagger/zod-openapi';
import { zodQuery } from '../common/validation/zod-validation.pipe';
import { toSchoolSummary } from './school.schema';
import { SchoolsService } from './schools.service';

@ApiTags('Schools')
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Search schools',
    description:
      'Search-as-you-type directory used during registration. Returns public school detail only; contact information is never included.',
  })
  @ApiZodQuery(schoolSearchSchema)
  async search(
    @Query(zodQuery(schoolSearchSchema)) query: SchoolSearchInput,
  ): Promise<PaginatedResult<SchoolSummary>> {
    return this.schoolsService.search(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a school by id' })
  @ApiParam({ name: 'id', description: 'School identifier' })
  @ApiErrorResponse(404, 'SCHOOL_NOT_FOUND', 'No school exists with that identifier')
  async findOne(@Param('id') id: string): Promise<SchoolSummary> {
    return toSchoolSummary(await this.schoolsService.findByIdOrFail(id));
  }
}
