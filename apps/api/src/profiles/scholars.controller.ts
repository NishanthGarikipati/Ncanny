import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UserRole, type AccessTokenClaims, type ScholarProfile, type SchoolRoster } from '@ncanny/types';
import {
  cannyIdParamSchema,
  updateScholarProfileSchema,
  type UpdateScholarProfileInput,
} from '@ncanny/validation';
import { CurrentUser, OptionalUser, Public, Roles } from '../common/auth/decorators';
import { getClientIp, getUserAgent, type NcannyRequest } from '../common/http/request-context';
import { ApiErrorResponse, ApiZodBody } from '../common/swagger/zod-openapi';
import { zodBody, zodParam } from '../common/validation/zod-validation.pipe';
import { ProfilesService } from './profiles.service';

@ApiTags('Scholars')
@Controller('scholars')
export class ScholarsController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  @ApiBearerAuth()
  @Roles(UserRole.SCHOLAR)
  @ApiOperation({ summary: "Get the signed-in Scholar's own profile" })
  @ApiErrorResponse(403, 'INSUFFICIENT_ROLE', 'The signed-in user is not a Scholar')
  async me(@CurrentUser() claims: AccessTokenClaims): Promise<ScholarProfile> {
    return this.profilesService.getScholarForOwner(claims.sub);
  }

  @Patch('me')
  @ApiBearerAuth()
  @Roles(UserRole.SCHOLAR)
  @ApiOperation({
    summary: "Update the signed-in Scholar's own profile",
    description:
      'A Scholar may only ever update their own profile; there is no endpoint for editing another user.',
  })
  @ApiZodBody(updateScholarProfileSchema)
  @ApiErrorResponse(400, 'VALIDATION_ERROR', 'One or more fields are invalid')
  async updateMe(
    @CurrentUser() claims: AccessTokenClaims,
    @Body(zodBody(updateScholarProfileSchema)) updates: UpdateScholarProfileInput,
    @Req() request: NcannyRequest,
  ): Promise<ScholarProfile> {
    return this.profilesService.updateScholarProfile(claims.sub, updates, {
      requestId: request.requestId,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });
  }

  @Get('school-roster')
  @ApiBearerAuth()
  @ApiOperation({
    summary: "People at the signed-in user's school",
    description: 'Names, Canny IDs, class and badges only. Email, phone and home address are omitted.',
  })
  async schoolRoster(@CurrentUser() claims: AccessTokenClaims): Promise<SchoolRoster> {
    return this.profilesService.schoolRoster(claims);
  }

  @Public()
  @Get(':cannyId')
  @ApiOperation({
    summary: 'Get a Scholar profile by Canny ID',
    description:
      'Visibility-aware. A profile the viewer may not see is reported as not found, so that visibility settings cannot be probed.',
  })
  @ApiParam({ name: 'cannyId', example: 'NCS-048213' })
  @ApiErrorResponse(404, 'PROFILE_NOT_FOUND', 'No visible profile exists for that Canny ID')
  async byCannyId(
    @Param(zodParam(cannyIdParamSchema)) params: { cannyId: string },
    @OptionalUser() claims?: AccessTokenClaims,
  ): Promise<ScholarProfile> {
    return this.profilesService.getScholarByCannyId(params.cannyId, claims);
  }
}
