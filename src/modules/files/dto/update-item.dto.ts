import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateItemDto {
  /** New name for the item. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  /** Move item under this parent folder (use together with moveToRoot). */
  @IsOptional()
  @IsString()
  newParentId?: string;

  /** Set to true to move item to root (no parent). */
  @IsOptional()
  @IsBoolean()
  moveToRoot?: boolean;
}
