import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are a helpful assistant that analyzes images and describes what you see.

When you receive an image:
- Look carefully at the image
- Describe what object or structure is shown
- Mention key features like shape, color, materials, style
- Keep descriptions brief (2-3 sentences)
- Be specific and helpful

Example response: "I can see a wooden chair with a curved backrest and four tapered legs. It has a cushioned seat in a light beige fabric."

Your response will be used to generate a 3D model, so focus on physical characteristics that would be relevant for 3D modeling.`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const apiKey = formData.get('apiKey') as string;
    const imageFile = formData.get('image') as File | null;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      );
    }

    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Convert image to base64 for OpenAI Vision API
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const imageDataURL = `data:${imageFile.type};base64,${buffer.toString('base64')}`;

    console.log('Analyzing image:', imageFile.name, imageFile.type, imageFile.size);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: SYSTEM_PROMPT + '\n\nPlease describe this image:' },
            { type: 'image_url', image_url: { url: imageDataURL } }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const description = response.choices[0]?.message?.content || 'Unable to analyze the image.';

    console.log('Image description:', description);

    return NextResponse.json({ description });
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    );
  }
}
