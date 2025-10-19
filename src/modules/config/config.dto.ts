import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateAllowedTypesDto {
  @ApiProperty({
    description: 'Allowed saving plan types (e.g., FLEXIBLE, FIXED, TARGET)',
    example: ['FLEXIBLE', 'FIXED'],
  })
  @IsArray()
  @IsString({ each: true })
  allowedSavingTypes: string[];

  @ApiProperty({
    description:
      'Allowed investment product ids (list of product document ids)',
    example: ['prod_1', 'prod_2'],
  })
  @IsArray()
  @IsString({ each: true })
  allowedInvestmentProductIds: string[];
}
