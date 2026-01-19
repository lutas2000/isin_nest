import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProcessingDto } from './create-processing.dto';

export class UpdateProcessingDto extends PartialType(
  OmitType(CreateProcessingDto, ['workOrderItemId'] as const),
) {}
