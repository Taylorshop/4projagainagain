import { IsNotEmpty, IsString } from 'class-validator';

export class CreateShareDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;
}
