import { UpdateBookDto } from './dto/update-book.dto';
import { CreateBookDto } from './dto/create-book.dto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DbService } from 'src/db/db.service';
import { Book } from './entities/book.entity';

function randomNum() {
  return Math.floor(Math.random() * 1000000);
}

@Injectable()
export class BookService {
  @Inject(DbService)
  dbService: DbService;
  async list() {
    const books: Book[] = await this.dbService.read();
    return books;
  }

  async findById(id: number) {
    const books: Book[] = await this.dbService.read();
    const book = books.find((item) => item.id === id);
    if (!book) {
      throw new BadRequestException('未找到该书籍');
    }
    return book;
  }

  async create(createBookDto: CreateBookDto) {
    const books: Book[] = await this.dbService.read();

    const book = new Book();
    book.id = randomNum();
    book.author = createBookDto.author;
    book.name = createBookDto.name;
    book.description = createBookDto.description;
    book.cover = createBookDto.cover;

    books.push(book);

    await this.dbService.write(books);
    return book;
  }

  async update(updateBookDto: UpdateBookDto) {
    const books: Book[] = await this.dbService.read();

    let foundBook = books.find((book) => book.id === updateBookDto.id);

    if (!foundBook) {
      throw new BadRequestException('该图书不存在');
    }

    foundBook = {
      ...foundBook,
      ...updateBookDto,
    };

    await this.dbService.write(books);
    return foundBook;
  }

  async delete(id: number) {
    const books: Book[] = await this.dbService.read();
    const index = books.findIndex((book) => book.id === id);

    if (index !== -1) {
      books.splice(index, 1);
      await this.dbService.write(books);
    }
  }
}
