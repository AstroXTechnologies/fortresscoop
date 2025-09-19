import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApAuthGuard } from 'src/modules/auth/auth-guard.decorator';
import { UserRole } from 'src/modules/user/user.model';
import {
  CreateUserInvestmentDto,
  UpdateUserInvestmentDto,
} from './investment.dto';
import { UserInvestmentsService } from './investment.service';

@ApiBearerAuth('access-token')
@ApAuthGuard(UserRole.USER)
@ApiTags('User Investments')
@Controller('user-investments')
export class UserInvestmentsController {
  constructor(private readonly service: UserInvestmentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new user investment (subscribe to a product)',
  })
  createUserInvestment(@Body() dto: CreateUserInvestmentDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user investments' })
  findAllUserInvestments() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user investment by ID' })
  findOneUserInvestment(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user investment by ID (rarely used)' })
  updateUserInvestment(
    @Param('id') id: string,
    @Body() dto: UpdateUserInvestmentDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a user investment by ID' })
  removeUserInvestment(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
