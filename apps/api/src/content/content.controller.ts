import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AccessTokenClaims, AcademicHall, MediaPayload, PaginatedResult, StoredMedia, WorkCard, WorkDetail } from '@ncanny/types';
import {
  createWorkSchema,
  presenceSchema,
  reportWorkSchema,
  reviewWorkSchema,
  uploadMediaSchema,
  workFeedSchema,
  type CreateWorkInput,
  type PresenceInput,
  type ReportWorkInput,
  type ReviewWorkInput,
  type UploadMediaInput,
  type WorkFeedInput,
} from '@ncanny/validation';
import { CurrentUser, OptionalUser } from '../common/auth/decorators';
import { getClientIp, getUserAgent, type NcannyRequest } from '../common/http/request-context';
import { zodBody, zodQuery } from '../common/validation/zod-validation.pipe';
import { ContentService } from './content.service';

function auditOf(request: NcannyRequest) {
  return {
    requestId: request.requestId,
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
  };
}

@ApiTags('Work')
@ApiBearerAuth()
@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Post('media')
  @ApiOperation({ summary: 'Store an image or audio file for a piece of work' })
  storeMedia(
    @CurrentUser() claims: AccessTokenClaims,
    @Body(zodBody(uploadMediaSchema)) body: UploadMediaInput,
    @Req() request: NcannyRequest,
  ): Promise<StoredMedia> {
    return this.content.storeMedia(claims, body, auditOf(request));
  }

  @Post('content')
  @ApiOperation({ summary: 'Publish or draft a piece of work' })
  create(
    @CurrentUser() claims: AccessTokenClaims,
    @Body(zodBody(createWorkSchema)) body: CreateWorkInput,
    @Req() request: NcannyRequest,
  ): Promise<WorkDetail> {
    return this.content.create(claims, body, auditOf(request));
  }

  @Get('content')
  @ApiOperation({ summary: 'School whiteboard feed, newest first' })
  feed(
    @CurrentUser() claims: AccessTokenClaims,
    @Query(zodQuery(workFeedSchema)) query: WorkFeedInput,
  ): Promise<PaginatedResult<WorkCard>> {
    return this.content.feed(claims, query);
  }

  @Get('content/mine')
  @ApiOperation({ summary: 'Work created by the signed-in user' })
  mine(@CurrentUser() claims: AccessTokenClaims): Promise<WorkCard[]> {
    return this.content.mine(claims);
  }

  @Get('content/:id')
  @ApiOperation({ summary: 'One piece of work, if the viewer is allowed to see it' })
  byId(
    @Param('id') id: string,
    @OptionalUser() claims?: AccessTokenClaims,
  ): Promise<WorkDetail> {
    return this.content.getById(id, claims);
  }

  @Get('content/:id/media')
  @ApiOperation({ summary: 'The file attached to a piece of work the viewer may see' })
  media(@Param('id') id: string, @OptionalUser() claims?: AccessTokenClaims): Promise<MediaPayload> {
    return this.content.readMedia(id, claims);
  }

  @Post('content/:id/review')
  @ApiOperation({ summary: 'Preceptor mark and feedback. Not an automated grade.' })
  review(
    @Param('id') id: string,
    @CurrentUser() claims: AccessTokenClaims,
    @Body(zodBody(reviewWorkSchema)) body: ReviewWorkInput,
    @Req() request: NcannyRequest,
  ): Promise<WorkDetail> {
    return this.content.review(id, claims, body, auditOf(request));
  }

  @Post('content/:id/report')
  @ApiOperation({ summary: 'Flag a piece of work for a Preceptor to look at' })
  report(
    @Param('id') id: string,
    @CurrentUser() claims: AccessTokenClaims,
    @Body(zodBody(reportWorkSchema)) body: ReportWorkInput,
    @Req() request: NcannyRequest,
  ): Promise<{ reported: true }> {
    return this.content.report(id, claims, body.reason, auditOf(request));
  }

  @Get('whiteboard/hall')
  @ApiOperation({ summary: 'Works and opted-in people for the academic hall' })
  hall(@CurrentUser() claims: AccessTokenClaims): Promise<AcademicHall> {
    return this.content.hall(claims);
  }

  @Post('whiteboard/presence')
  @ApiOperation({ summary: 'Opt in or out of appearing in the academic hall' })
  presence(
    @CurrentUser() claims: AccessTokenClaims,
    @Body(zodBody(presenceSchema)) body: PresenceInput,
  ): Promise<{ optedIn: boolean }> {
    return this.content.setPresence(claims, body.optedIn);
  }
}
