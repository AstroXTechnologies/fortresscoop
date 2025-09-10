import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsPhoneNumber, MinLength } from 'class-validator';

export class CreateUserDto {
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
