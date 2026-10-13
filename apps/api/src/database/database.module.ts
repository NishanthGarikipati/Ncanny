import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigService } from '../config/app-config.service';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        uri: config.mongoUri,
        dbName: config.mongoDbName,
        // Index creation is convenient in development but is a schema-change
        // operation that should be deliberate in production.
        autoIndex: !config.isProduction,
        serverSelectionTimeoutMS: 10_000,
        maxPoolSize: 20,
      }),
    }),
  ],
})
export class DatabaseModule {}
