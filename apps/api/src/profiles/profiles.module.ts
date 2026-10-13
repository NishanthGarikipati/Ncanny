import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IdentityModule } from '../identity/identity.module';
import { SchoolsModule } from '../schools/schools.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { PreceptorsController } from './preceptors.controller';
import { ProfilesService } from './profiles.service';
import { PreceptorProfile, PreceptorProfileSchema } from './schemas/preceptor-profile.schema';
import { ScholarProfile, ScholarProfileSchema } from './schemas/scholar-profile.schema';
import { ScholarsController } from './scholars.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScholarProfile.name, schema: ScholarProfileSchema },
      { name: PreceptorProfile.name, schema: PreceptorProfileSchema },
    ]),
    IdentityModule,
    SchoolsModule,
    SubjectsModule,
  ],
  controllers: [ScholarsController, PreceptorsController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
