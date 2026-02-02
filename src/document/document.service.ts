import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
  ) {}

  create(createDocumentDto: CreateDocumentDto): Promise<Document> {
    const document = this.documentRepository.create(createDocumentDto);
    return this.documentRepository.save(document);
  }

  async createWithFile(
    file: Express.Multer.File,
    data: { title: string; ownerId: number },
  ): Promise<Document> {
    const document = this.documentRepository.create({
      title: data.title,
      ownerId: data.ownerId,
      content: '',
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      filePath: `uploads/${file.filename}`,
      fileSize: file.size,
    });
    return this.documentRepository.save(document);
  }

  // Update file for existing document
  async updateFile(id: string, file: Express.Multer.File): Promise<Document> {
    const document = await this.findOne(id);

    // Delete old file if exists
    if (document.filePath) {
      try {
        await unlink(join(process.cwd(), document.filePath));
      } catch (err) {
        // File might not exist, continue
      }
    }

    // Update with new file info
    document.fileName = file.filename;
    document.originalName = file.originalname;
    document.mimeType = file.mimetype;
    document.filePath = `uploads/${file.filename}`;
    document.fileSize = file.size;

    return this.documentRepository.save(document);
  }

  findAll(): Promise<Document[]> {
    return this.documentRepository.find({ relations: ['owner'] });
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ['owner'],
    });
    if (!document) {
      throw new NotFoundException(`Document ${id} not found`);
    }
    return document;
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto): Promise<Document> {
    const document = await this.findOne(id);
    Object.assign(document, updateDocumentDto);
    return this.documentRepository.save(document);
  }

  async updateContent(id: string, content: string): Promise<void> {
    const result = await this.documentRepository.update(id, { content });
    if (result.affected === 0) {
      throw new NotFoundException(`Document ${id} not found`);
    }
  }

  async remove(id: string): Promise<void> {
    const document = await this.findOne(id);

    // Delete file if exists
    if (document.filePath) {
      try {
        await unlink(join(process.cwd(), document.filePath));
      } catch (err) {
        // File might not exist, continue
      }
    }

    await this.documentRepository.delete(id);
  }
}
