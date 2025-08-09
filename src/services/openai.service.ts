import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
@Injectable()
export class OpenAIService {
  private openai: OpenAI;
  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
  }

  async generateScript(
    prompt: string,
    stream_response: boolean,
    streamCallback: (chunk: any) => void,
    session_id: string,
    genre?: string,
  ): Promise<string> {
    const systemPrompt = `You are a professional screenwriter. Create a compelling movie script based on the user's request. 
    ${genre ? `The genre should be: ${genre}` : ''}
    
    Format the script in standard screenplay format with:
    - Scene headings (INT./EXT. LOCATION - TIME)
    - Character names in CAPS
    - Dialogue indented
    - Action descriptions
    - Parentheticals for character directions
    
    Make it engaging, well-structured, and ready for production.`;

    if (stream_response) {
      let scriptGenerated = '';
      const completion = await this.openai.chat.completions.create({
        model: 'gemini-2.0-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        stream: stream_response,
      });

      for await (const chunk of completion) {
        scriptGenerated += chunk.choices[0]?.delta?.content;
        streamCallback({
          type: 'ai_ad_script',
          data: {
            message: chunk.choices[0]?.delta?.content,
            sessionId: session_id,
          },
        });
      }

      return scriptGenerated;
    } else {
      const completion = await this.openai.chat.completions.create({
        model: 'gemini-2.0-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
      });

      return completion.choices[0]?.message?.content || '';
    }
  }

  async generateImage(prompt: string, style?: string): Promise<string> {
    // const enhancedPrompt = style
    //   ? `${prompt}, ${style} style, high quality, cinematic lighting`
    //   : `${prompt}, high quality, cinematic lighting`;

    try {
      // const response = await this.openAIImage.images.generate({
      //   model: 'dall-e-3',
      //   prompt: prompt,
      //   response_format: 'b64_json',
      // });

      // if (
      //   response !== null &&
      //   response !== undefined &&
      //   response.data !== undefined
      // ) {
      //   const image_base64 = response.data[0].b64_json;
      //   const image_bytes = Buffer.from(image_base64!, 'base64');
      //   fs.writeFileSync(`${uuidv4()}.png`, image_bytes);
      // }

      // console.log('Image Generated for the user is');
      // console.log(response);

      // if (response.data === null || response.data === undefined) {
      //   throw new Error('No image generated');
      // }

      return '';
    } catch (err) {
      console.log('Error while generating image is:  ', err);
      return '';
    }
  }

  async analyzeScript(
    scriptContent: string,
    stream_response: boolean,
    streamCallback: (chunk: any) => void,
    session_id: string,
  ): Promise<any> {
    if (stream_response) {
      const completion = await this.openai.chat.completions.create({
        model: 'gemini-2.0-flash',
        messages: [
          {
            role: 'system',
            content:
              'Analyze this movie script and provide insights about: 1) Genre classification, 2) Key themes, 3) Character analysis, 4) Scene breakdown, 5) Production considerations. Return as JSON.',
          },
          { role: 'user', content: scriptContent },
        ],
        temperature: 0.3,
        stream: stream_response,
      });

      for await (const chunk of completion) {
        streamCallback({
          type: 'user_message',
          data: {
            message: chunk.choices[0]?.delta?.content || '',
            sessionId: session_id,
          },
        });
      }

      return 'All chunks streamed back';
    } else {
      const completion = await this.openai.chat.completions.create({
        model: 'gemini-2.0-flash',
        messages: [
          {
            role: 'system',
            content:
              'Analyze this movie script and provide insights about: 1) Genre classification, 2) Key themes, 3) Character analysis, 4) Scene breakdown, 5) Production considerations. Return as JSON.',
          },
          { role: 'user', content: scriptContent },
        ],
        temperature: 0.3,
      });

      try {
        return JSON.parse(completion.choices[0]?.message?.content || '{}');
      } catch {
        return { analysis: completion.choices[0]?.message?.content || '' };
      }
    }
  }

  async generateSceneDescription(
    scriptExcerpt: string,
    stream_response: boolean,
    streamCallback: (chunk: any) => void,
    session_id: string,
  ): Promise<string> {
    if (stream_response) {
      let scriptGenerated = '';
      // console.log('Script Excpert is');
      // console.log(scriptExcerpt);

      const completion = await this.openai.chat.completions.create({
        model: 'gemini-2.0-flash',
        messages: [
          {
            role: 'system',
            content:
              'Based on this script excerpt, create a detailed visual description for generating a scene image. Focus on: setting, lighting, mood, composition, and visual style',
          },
          { role: 'user', content: scriptExcerpt },
        ],
        temperature: 0.7,
        stream: stream_response,
      });

      for await (const chunk of completion) {
        scriptGenerated += chunk.choices[0]?.delta?.content;

        streamCallback({
          type: 'ai_scene_description',
          data: {
            message: chunk.choices[0]?.delta?.content || '',
            sessionId: session_id,
          },
        });
      }

      // console.log("Final Scriot Generated is")
      // console.log(scriptGenerated)

      return scriptGenerated;
    } else {
      const completion = await this.openai.chat.completions.create({
        model: 'gemini-2.0-flash',
        messages: [
          {
            role: 'system',
            content:
              'Based on this script excerpt, create a detailed visual description for generating a scene image. Focus on: setting, lighting, mood, composition, and visual style.',
          },
          { role: 'user', content: scriptExcerpt },
        ],
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || '';
    }
  }
}
