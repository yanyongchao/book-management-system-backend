import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
  UploadedFiles,
  Query,
} from '@nestjs/common';
import { BookService } from './book.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { storage } from './my-file-storage';
import * as path from 'path';
import * as fs from 'fs';

@Controller('book')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Get('list')
  async list() {
    return this.bookService.list();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.bookService.findById(+id);
  }

  @Post('create')
  async create(@Body() createBookDto: CreateBookDto) {
    return this.bookService.create(createBookDto);
  }

  @Post('update')
  async update(@Body() updateBookDto: UpdateBookDto) {
    return this.bookService.update(updateBookDto);
  }

  @Delete('delete/:id')
  async delete(@Param('id') id: string) {
    return this.bookService.delete(+id);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: 'uploads',
      storage: storage,
      limits: {
        fileSize: 1024 * 1024 * 3,
      },
      fileFilter(req, file, callback) {
        const extname = path.extname(file.originalname);
        if (['.png', '.jpg', '.gif'].includes(extname)) {
          callback(null, true);
        } else {
          callback(new BadRequestException('只能上传图片'), false);
        }
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('文件上传失败');
    }
    return file.path;
  }

  // 写一个分片上传
  @Post('short/upload')
  @UseInterceptors(
    FilesInterceptor('files', 2000, {
      dest: 'uploads',
    }),
  )
  uploadFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body: { name: string },
  ) {
    const match = body.name.match(/(.+)\-\d+$/);
    if (!match) {
      throw new BadRequestException('Invalid file name format');
    }
    const fileName = match[1];
    const chunkDir = 'uploads/chunks_' + fileName;

    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir);
    }
    fs.cpSync(files[0].path, chunkDir + '/' + body.name);
    fs.rmSync(files[0].path);
  }

  private getLastPartAfterDash(fileName: string): number {
    const lastDashIndex = fileName.lastIndexOf('-');
    if (lastDashIndex === -1) {
      throw new BadRequestException('Invalid file name format');
    }
    return parseInt(fileName.substring(lastDashIndex + 1), 10);
  }

  @Get('short/merge')
  merge(@Query('name') name: string) {
    const chunkDir = 'uploads/chunks_' + name;

    let files = fs.readdirSync(chunkDir);

    files = files.sort(
      (a, b) => this.getLastPartAfterDash(a) - this.getLastPartAfterDash(b),
    );
    let count = 0;
    let startPos = 0;
    files.map((file) => {
      console.log('file', file);
      const filePath = chunkDir + '/' + file;
      const stream = fs.createReadStream(filePath);
      stream
        .pipe(
          fs.createWriteStream('uploads/' + name, {
            start: startPos,
          }),
        )
        .on('finish', () => {
          count++;

          if (count === files.length) {
            fs.rm(
              chunkDir,
              {
                recursive: true,
              },
              () => {},
            );
          }
        });
      startPos += fs.statSync(filePath).size;
    });
  }
}
