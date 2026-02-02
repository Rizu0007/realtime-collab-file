import { IsNotEmpty, IsString, IsOptional, IsNumberString } from 'class-validator';

export class UploadDocumentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsNumberString()
  @IsNotEmpty()
  ownerId: string;
}
