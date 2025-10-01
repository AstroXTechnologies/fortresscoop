import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  uid: string;
  @ApiProperty({ description: 'Email address of the user' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'First name (min 3 characters)' })
  @IsNotEmpty()
  @MinLength(3)
  fullName: string;

  @ApiProperty({ description: 'Phone number (min 11 characters)' })
  @IsPhoneNumber()
  @MinLength(11)
  phoneNumber: string;

  @ApiProperty({ description: 'Password (min 6 characters)' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @MinLength(3)
  fullName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    required: false,
    description: 'User preference: global auto rollover',
  })
  @IsOptional()
  @IsBoolean()
  globalRollover?: boolean;

  @ApiProperty({
    required: false,
    description: 'User preference: email notifications',
  })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiProperty({
    required: false,
    description: 'User preference: sms notifications',
  })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;
}
