import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UserRole, type AccessTokenClaims, type PreceptorProfile } from '@ncanny/types';
import {
  cannyIdParamSchema,
  updatePreceptorProfileSchema,
  type UpdatePreceptorProfileInput,
} from '@ncanny/validation';
import { CurrentUser, OptionalUser, Public, Roles } from '../common/auth/decorators';
import { getClientIp, getUserAgent, type NcannyRequest } from '../common/http/request-context';
import { ApiErrorResponse, ApiZodBody } from '../common/swagger/zod-openapi';
import { zodBody, zodParam } from '../common/validation/zod-validation.pipe';
import { ProfilesService } from './profiles.service';

@ApiTags('Preceptors')
@Controller('preceptors')
export class PreceptorsController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  @ApiBearerAuth()
  @Roles(UserRole.PRECEPTOR)
  @ApiOperation({ summary: "Get the signed-in Preceptor's own profile" })
  @ApiErrorResponse(403, 'INSUFFICIENT_ROLE', 'The signed-in user is not a Preceptor')
  async me(@CurrentUser() claims: AccessTokenClaims): Promise<PreceptorProfile> {
    return this.profilesService.getPreceptorForOwner(claims.sub);
  }

  @Patch('me')
  @ApiBearerAuth()
  @Roles(UserRole.PRECEPTOR)
  @ApiOperation({ summary: "Update the signed-in Preceptor's own profile" })
  @ApiZodBody(updatePreceptorProfileSchema)
  @ApiErrorResponse(400, 'VALIDATION_ERROR', 'One or more fields are invalid')
  async updateMe(
    @CurrentUser() claims: AccessTokenClaims,
    @Body(zodBody(updatePreceptorProfileSchema)) updates: UpdatePreceptorProfileInput,
    @Req() request: NcannyRequest,
  ): Promise<PreceptorProfile> {
    return this.profilesService.updatePreceptorProfile(claims.sub, updates, {
      requestId: request.requestId,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });
  }

  @Public()
  @Get(':cannyId')
  @ApiOperation({ summary: 'Get a Preceptor profile by Canny ID' })
  @ApiParam({ name: 'cannyId', example: 'NCP-104822' })
  @ApiErrorResponse(404, 'PROFILE_NOT_FOUND', 'No visible profile exists for that Canny ID')
  async byCannyId(
    @Param(zodParam(cannyIdParamSchema)) params: { cannyId: string },
    @OptionalUser() claims?: AccessTokenClaims,
  ): Promise<PreceptorProfile> {
    return this.profilesService.getPreceptorByCannyId(params.cannyId, claims);
  }
}
