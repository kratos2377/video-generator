import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthCheck(): string {
    return 'Listening on port 4000';
  }
}
