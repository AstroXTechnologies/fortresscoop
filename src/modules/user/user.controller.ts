import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { ApAuthGuard } from 'src/modules/auth/auth-guard.decorator';
import { UserRole } from 'src/modules/user/user.model';
import { CreateUserDto, UpdateUserDto } from './user.dto';
import { UserService } from './user.service';

@Controller('user')
@ApiBearerAuth('access-token')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create')
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @ApAuthGuard(UserRole.USER)
  @Get()
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'page', required: false })
  findAll(@Query('limit') limit?: string, @Query('page') page?: string) {
    if (limit || page) {
      return this.userService.findAllPaginated(
        Number(limit) || 25,
        Number(page) || 1,
      );
    }
    return this.userService.findAll();
  }

  @ApAuthGuard(UserRole.USER)
  @ApiQuery({
    name: 'email',
    required: false,
  })
  @ApiQuery({
    name: 'uid',
    required: false,
  })
  @ApiQuery({
    name: 'name',
    required: false,
  })
  @Get('findOne')
  findOneUser(@Query() model: Partial<CreateUserDto>) {
    return this.userService.findOne({ ...model });
  }

  // Unified update: admins can update any user; regular users only their own id
  @ApAuthGuard(UserRole.USER, UserRole.ADMIN)
  @Patch(':id')
  updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request & { user?: { uid?: string; role?: string } },
  ) {
    const actor = req.user;
    if (!actor) throw new ForbiddenException('Unauthenticated');
    if (actor.role !== 'admin' && actor.uid !== id) {
      throw new ForbiddenException('Not allowed to update other users');
    }
    return this.userService.update(id, updateUserDto);
  }

  // user self-update (profile & settings)
  @ApAuthGuard(UserRole.USER)
  @Patch('profile/:id')
  updateOwn(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.userService.update(id, body);
  }

  @ApAuthGuard(UserRole.ADMIN)
  @Delete(':id')
  removeUser(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @ApAuthGuard(UserRole.ADMIN)
  @Get(':id/admin-summary')
  getAdminUserSummary(@Param('id') id: string) {
    return this.userService.getAdminUserSummary(id);
  }
}
