import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CannyIdService } from './canny-id.service';
import { PasswordService } from './password.service';
import { OtpChallenge, OtpChallengeSchema } from './schemas/otp-challenge.schema';
import { User, UserSchema } from './schemas/user.schema';
import { UserSession, UserSessionSchema } from './schemas/user-session.schema';
import { SessionsService } from './sessions.service';
import { UsersService } from './users.service';

/** Owns accounts, credentials, sessions and Canny ID issuance. */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserSession.name, schema: UserSessionSchema },
      { name: OtpChallenge.name, schema: OtpChallengeSchema },
    ]),
  ],
  providers: [UsersService, SessionsService, CannyIdService, PasswordService],
  exports: [UsersService, SessionsService, CannyIdService, PasswordService, MongooseModule],
})
export class IdentityModule {}
