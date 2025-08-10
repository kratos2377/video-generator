import { GenerateImagesResponse, GoogleGenAI } from '@google/genai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { S3Service } from './s3.service';

@Injectable()
export class GoogleGenAIService {
  private googleGenAI: GoogleGenAI;
  constructor(
    private configService: ConfigService,
    private s3Service: S3Service,
  ) {
    this.googleGenAI = new GoogleGenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateImage(
    prompt: string,
    streamCallback: (chunk: any) => void,
  ): Promise<GenerateImagesResponse | null> {
    try {
      const imagenResponse = await this.googleGenAI.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: prompt,
      });

      return imagenResponse;
    } catch (err) {
      console.error('Image generation failed:', err);

      streamCallback({
        type: 'ai_image_generation_error',
        data: {
          message: 'Error while generating Image',
        },
      });

      return null;
    }
  }

  async generateImageToVideo(
    imageRespone: GenerateImagesResponse,
    prompt?: string,
  ): Promise<string> {
    const videoPrompt =
      prompt ||
      'Create a smooth, cinematic video from this image with subtle camera movement';

    try {
      let operation = await this.googleGenAI.models.generateVideos({
        model: 'veo-3.0-generate-preview',
        prompt: videoPrompt,
        image: {
          imageBytes: imageRespone.generatedImages![0].image!.imageBytes,
          mimeType: 'image/png',
        },
      });

      while (!operation.done) {
        console.log('Waiting for video generation to complete...');
        operation = await this.googleGenAI.operations.getVideosOperation({
          operation: operation,
        });
      }

      const chatMediaKey = `video-${uuidv4()}.mp4`;

      // console.log("Video Response is")
      // console.log( operation.response!.generatedVideos![0])

      // const videoUploadUrl = await this.s3Service.uploadFile(
      //   Buffer.from( operation.response!.generatedVideos![0].video!.videoBytes!, 'base64'),
      //   chatMediaKey,
      //   MediaType.VIDEO,
      // );

      // // const videoUploadUrl = await this.s3Service

      await this.googleGenAI.files.download({
        file: operation.response!.generatedVideos![0].video!,
        downloadPath: `videos/${chatMediaKey}`,
      });

      // // const uplaodOBj = await this.s3Service.uploadMediaFile(
      // //   fs.readFileSync(
      // //     `/home/monarch/proj/movie-generator/videos/${chatMediaKey}`,
      // //   ),
      // //   chatMediaKey,
      // //   MediaType.VIDEO,
      // // );

      return operation.response!.generatedVideos![0].video!.uri!;
    } catch (error) {
      console.error('Image-to-video generation failed:', error);
      // Fallback: return the original image URL
      return `'Image-to-video generation failed:', ${error}`;
    }
  }
}
