import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.leadsService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async importCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo CSV não enviado');

    const rows: Array<Record<string, string>> = await new Promise(
      (resolve, reject) => {
        const results: Array<Record<string, string>> = [];
        const stream = Readable.from(file.buffer);
        stream
          .pipe(csvParser())
          .on('data', (row: Record<string, string>) => results.push(row))
          .on('end', () => resolve(results))
          .on('error', reject);
      },
    );

    return this.leadsService.importFromCsv(rows);
  }
}
