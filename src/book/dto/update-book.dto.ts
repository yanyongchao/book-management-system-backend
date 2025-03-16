import { PartialType } from '@nestjs/mapped-types';
import { CreateBookDto } from './create-book.dto';
import { IsNotEmpty } from 'class-validator';

export class UpdateBookDto extends PartialType(CreateBookDto) {
  @IsNotEmpty({ message: 'id 不能为空' })
  id: number;
}
