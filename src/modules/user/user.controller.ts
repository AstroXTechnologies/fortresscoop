import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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

  @ApAuthGuard(UserRole.ADMIN)
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

  @ApAuthGuard(UserRole.USER, UserRole.ADMIN)
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

  @ApAuthGuard(UserRole.ADMIN)
  @Patch(':id')
  updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  // user self-update (profile & settings)
  @ApAuthGuard(UserRole.USER, UserRole.ADMIN)
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
