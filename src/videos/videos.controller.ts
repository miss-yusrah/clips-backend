import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LoginGuard } from '../auth/guards/login.guard.js';
import { ClipsService } from '../clips/clips.service.js';
import { CreateVideoDto } from './dto/create-video.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@UseGuards(LoginGuard)
@Controller('videos')
export class VideosController {
  constructor(
    private readonly clipsService: ClipsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getVideos() {
    return { message: 'Videos endpoint' };
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createVideoDto: CreateVideoDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let sourceUrl = createVideoDto.sourceUrl;
    let sourceType = createVideoDto.sourceType || 'youtube';

    if (file) {
      // Create temp directory if it doesn't exist
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Generate a unique filename
      const filename = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
      const filepath = path.join(tempDir, filename);

      // Save buffer to file
      fs.writeFileSync(filepath, file.buffer);

      sourceUrl = filepath;
      sourceType = 'upload';
    } else if (!sourceUrl) {
      throw new BadRequestException('Either sourceUrl or file must be provided');
    }

    // Create the video record in the database
    const video = await this.prisma.video.create({
      data: {
        userId: Number(createVideoDto.userId),
        title: createVideoDto.title,
        description: createVideoDto.description,
        sourceType,
        sourceUrl,
        thumbnail: createVideoDto.thumbnail,
        duration: createVideoDto.duration,
        targetPlatforms: createVideoDto.targetPlatforms || [],
        status: 'pending',
      },
    });

    return {
      message: 'Video created successfully',
      data: video,
    };
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.clipsService.cancelVideo(id);
  }
}
