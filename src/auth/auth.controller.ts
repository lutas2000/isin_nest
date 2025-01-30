import { Controller, Post, Body } from '@nestjs/common';
// import { Johnson } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  login(@Body() user: User) {
    return this.authService.login(user);
  }
}
