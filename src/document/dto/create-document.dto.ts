import { IsNotEmpty, IsString, IsOptional, IsInt } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsInt()
  @IsNotEmpty()
  ownerId: number;
}
