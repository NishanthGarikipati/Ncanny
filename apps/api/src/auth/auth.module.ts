import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigService } from '../config/app-config.service';
import { IdentityModule } from '../identity/identity.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { SchoolsModule } from '../schools/schools.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { OtpService } from './otp.service';
import {
  LoggingOtpDeliveryProvider,
  OTP_DELIVERY_PROVIDER,
} from './providers/otp-delivery.provider';
import { TokenService } from './token.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: config.accessTokenTtlSeconds },
      }),
    }),
    IdentityModule,
    ProfilesModule,
    SchoolsModule,
    SubjectsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    OtpService,
    { provide: OTP_DELIVERY_PROVIDER, useClass: LoggingOtpDeliveryProvider },
    // Registered globally: every route requires authentication unless it opts
    // out with @Public(), so a new endpoint is protected by default.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
