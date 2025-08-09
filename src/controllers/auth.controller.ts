import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Redirect,
  Query,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google-auth')
  @Redirect()
  async googleAuth(): Promise<{ url: string }> {
    return this.authService.googleAuth();
  }

  @Get('google-callback')
  @Redirect()
  async googleAuthCallback(
    @Query('code') code: string,
  ): Promise<{ url: string }> {
    const { email, refreshToken, accessToken } =
      await this.authService.getAuthClientData(code);
    return { url: process.env.REDIRECT_TO_LOGIN! };
  }
}
