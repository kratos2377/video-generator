import { GenerateImagesResponse, GoogleGenAI } from '@google/genai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class GoogleGenAIService {
  private googleGenAI: GoogleGenAI;
  constructor(private configService: ConfigService) {
    this.googleGenAI = new GoogleGenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateImage(prompt: string): Promise<GenerateImagesResponse | null> {
    try {
      console.log('Image Prompt: ' + prompt);

      const imagenResponse = await this.googleGenAI.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: prompt,
      });

      console.log('ImageGenResponse is');
      console.log(imagenResponse);
      return imagenResponse;
    } catch (err) {
      console.error('Image generation failed:', err);

      return null;
    }
  }

  async generateImageToVideo(
    imageRespone: GenerateImagesResponse,
    prompt?: string,
  ): Promise<string> {
    //Implement VEO3 API for image to video generation

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

      await this.googleGenAI.files.download({
        file: operation.response!.generatedVideos![0].video!,
        downloadPath: `videos/veo3_with_image_input-${uuidv4()}.mp4`,
      });

      return '';
    } catch (error) {
      console.error('Image-to-video generation failed:', error);
      // Fallback: return the original image URL
      return `'Image-to-video generation failed:', ${error}`;
    }
  }
}
