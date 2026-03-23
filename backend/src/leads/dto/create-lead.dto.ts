import { IsString, IsOptional, IsEnum } from 'class-validator';
import { LeadStatus } from '../lead.enum';

export class CreateLeadDto {
  @IsString()
  businessName: string;

  @IsOptional()
  @IsString()
  segment?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  googleMapsUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;
}
