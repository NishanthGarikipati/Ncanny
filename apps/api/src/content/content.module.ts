import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { IdentityModule } from '../identity/identity.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { MediaStorage } from './media.storage';
import { Work, WorkSchema } from './schemas/content.schema';
import {
  WorkBookmark,
  WorkBookmarkSchema,
  WorkCommentRecord,
  WorkCommentSchema,
  WorkReaction,
  WorkReactionSchema,
} from './schemas/engagement.schema';
import { HallPresenceRecord, HallPresenceSchema } from './schemas/hall-presence.schema';
import { MediaAsset, MediaAssetSchema } from './schemas/media-asset.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Work.name, schema: WorkSchema },
      { name: MediaAsset.name, schema: MediaAssetSchema },
      { name: HallPresenceRecord.name, schema: HallPresenceSchema },
      { name: WorkReaction.name, schema: WorkReactionSchema },
      { name: WorkCommentRecord.name, schema: WorkCommentSchema },
      { name: WorkBookmark.name, schema: WorkBookmarkSchema },
    ]),
    IdentityModule,
    ProfilesModule,
    SubjectsModule,
    AuditModule,
  ],
  controllers: [ContentController],
  providers: [ContentService, MediaStorage],
})
export class ContentModule {}
