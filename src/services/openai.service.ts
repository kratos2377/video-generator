import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateScript(prompt: string, genre?: string): Promise<string> {
    const systemPrompt = `You are a professional screenwriter. Create a compelling movie script based on the user's request. 
    ${genre ? `The genre should be: ${genre}` : ''}
    
    Format the script in standard screenplay format with:
    - Scene headings (INT./EXT. LOCATION - TIME)
    - Character names in CAPS
    - Dialogue indented
    - Action descriptions
    - Parentheticals for character directions
    
    Make it engaging, well-structured, and ready for production.`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.8,
    });

    return completion.choices[0]?.message?.content || '';
  }

  async generateImage(prompt: string, style?: string): Promise<string> {
    const enhancedPrompt = style
      ? `${prompt}, ${style} style, high quality, cinematic lighting`
      : `${prompt}, high quality, cinematic lighting`;

    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'hd',
    });

    if (response.data === null || response.data === undefined) {
      throw new Error('No image generated');
    }

    return response.data[0]?.url || '';
  }

  async generateImageToVideo(
    imageUrl: string,
    prompt?: string,
  ): Promise<string> {
    
    //Implement VEO3 API for image to video generation

    const videoPrompt =
      prompt ||
      'Create a smooth, cinematic video from this image with subtle camera movement';

    try {
      // const response = await this.openai.videos.generate({
      //   model: 'dall-e-3',
      //   prompt: videoPrompt,
      //   image: imageUrl,
      //   n: 1,
      //   size: '1024x1024',
      //   duration: 3,
      // });

      return  '';
    } catch (error) {
      console.error('Image-to-video generation failed:', error);
      // Fallback: return the original image URL
      return imageUrl;
    }
  }

  async analyzeScript(scriptContent: string): Promise<any> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'Analyze this movie script and provide insights about: 1) Genre classification, 2) Key themes, 3) Character analysis, 4) Scene breakdown, 5) Production considerations. Return as JSON.',
        },
        { role: 'user', content: scriptContent },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });

    try {
      return JSON.parse(completion.choices[0]?.message?.content || '{}');
    } catch {
      return { analysis: completion.choices[0]?.message?.content || '' };
    }
  }

  async generateSceneDescription(scriptExcerpt: string): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'Based on this script excerpt, create a detailed visual description for generating a scene image. Focus on: setting, lighting, mood, composition, and visual style.',
        },
        { role: 'user', content: scriptExcerpt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || '';
  }
}
