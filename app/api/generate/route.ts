import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are an expert 3D modeling assistant that creates detailed Three.js models from descriptions and images.

CREATE COMPLEX, DETAILED MODELS:
- Use MULTIPLE geometries (boxes, cylinders, spheres, cones, tori) to build complex objects
- Combine primitives to create realistic shapes (e.g., a chair = seat + backrest + 4 legs + crossbars)
- Position each part precisely using position.set(x, y, z)
- Rotate parts using rotation.x/y/z for angled components
- Scale geometries to create different proportions
- Use DIFFERENT colors/materials for different parts (wood, metal, fabric, etc.)
- Add details like handles, knobs, decorations, trim, cushions

TECHNICAL REQUIREMENTS:
- Use THREE.MeshStandardMaterial for all materials
- Set appropriate colors (hex: 0xRRGGBB) for realism
- Add roughness and metalness properties: new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8, metalness: 0.1 })
- Mark every mesh with userData.userAdded = true
- Use scene.add(mesh) for each mesh
- Center the overall object at origin

GROUPING (when appropriate):
- For complex objects, create a THREE.Group()
- Add parts to the group: group.add(part1); group.add(part2);
- Add the group to scene: scene.add(group)
- Mark the group: group.userData.userAdded = true

GEOMETRY TYPES AVAILABLE:
- BoxGeometry(width, height, depth)
- CylinderGeometry(radiusTop, radiusBottom, height, radialSegments)
- SphereGeometry(radius, widthSegments, heightSegments)
- ConeGeometry(radius, height, radialSegments)
- TorusGeometry(radius, tube, radialSegments, tubularSegments)
- PlaneGeometry(width, height)

EXAMPLE - DETAILED CHAIR:
const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2), new THREE.MeshStandardMaterial({ color: 0x4A3728, roughness: 0.9 }));
seat.position.set(0, 1, 0);
seat.userData.userAdded = true;
const backrest = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 0.15), new THREE.MeshStandardMaterial({ color: 0x4A3728, roughness: 0.9 }));
backrest.position.set(0, 1.85, -0.925);
backrest.userData.userAdded = true;
const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1), new THREE.MeshStandardMaterial({ color: 0x2C1810, roughness: 0.7, metalness: 0.2 }));
leg1.position.set(-0.9, 0.5, -0.9);
leg1.userData.userAdded = true;
const leg2 = leg1.clone(); leg2.position.set(0.9, 0.5, -0.9);
const leg3 = leg1.clone(); leg3.position.set(-0.9, 0.5, 0.9);
const leg4 = leg1.clone(); leg4.position.set(0.9, 0.5, 0.9);
scene.add(seat, backrest, leg1, leg2, leg3, leg4);

OUTPUT FORMAT:
- Respond ONLY with valid JSON: { "message": "...", "code": "..." }
- No markdown, no code blocks
- "message": Brief description of what you created
- "code": Executable Three.js code

ALWAYS AIM FOR DETAIL - More parts = Better model!`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const messages = JSON.parse(formData.get('messages') as string);
    const apiKey = formData.get('apiKey') as string;
    const imageFile = formData.get('image') as File | null;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 401 }
      );
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Convert image to base64 for OpenAI Vision API
    let imageDataURL: string | undefined;
    if (imageFile) {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      imageDataURL = `data:${imageFile.type};base64,${buffer.toString('base64')}`;
      console.log('Image file name:', imageFile.name);
      console.log('Image file type:', imageFile.type);
      console.log('Image file size:', imageFile.size);
      console.log('Image data URL length:', imageDataURL.length);
      console.log('Image data URL prefix:', imageDataURL.substring(0, 50) + '...');
    }

    console.log('Sending request to OpenAI with messages:', messages);
    console.log('Has image:', !!imageFile);

    // Build the messages array with vision format
    const apiMessages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
      { role: 'system', content: SYSTEM_PROMPT }
    ];

    // Add previous messages (without images)
    for (const msg of messages.slice(0, -1)) {
      apiMessages.push({
        role: msg.role,
        content: msg.content
      });
    }

    // Add the current user message with potential image
    const lastMessage = messages[messages.length - 1];
    if (imageDataURL) {
      const userContent = [
        { type: 'text', text: lastMessage.content },
        { type: 'image_url', image_url: { url: imageDataURL } }
      ];
      console.log('User content with image:', JSON.stringify(userContent, null, 2).substring(0, 500) + '...');
      apiMessages.push({
        role: 'user',
        content: userContent
      });
    } else {
      console.log('No image found, sending text only:', lastMessage.content);
      apiMessages.push({
        role: 'user',
        content: lastMessage.content
      });
    }

    console.log('Final API messages structure:', JSON.stringify(apiMessages.map(m => ({
      role: m.role,
      contentType: typeof m.content,
      isArray: Array.isArray(m.content),
      contentPreview: Array.isArray(m.content) ? `${m.content.length} items` : (m.content as string).substring(0, 100)
    })), null, 2));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Supports vision
      messages: apiMessages as any,
      max_tokens: 4096,
      temperature: 0.7,
    });

    let content = response.choices[0]?.message?.content || '';

    console.log('Raw OpenAI response:', content);

    // Clean up the response - remove markdown code blocks if present
    content = content.trim();

    // Remove markdown code blocks
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      content = codeBlockMatch[1].trim();
    }

    // Remove any remaining markdown
    content = content.replace(/^```\w*?\n?/gm, '').replace(/```$/gm, '');

    console.log('Cleaned content:', content);

    // Parse JSON response
    let message = "I've created your 3D model!";
    let code = '';

    try {
      const parsed = JSON.parse(content);
      message = parsed.message || message;
      code = parsed.code || '';
    } catch (e) {
      console.warn('Failed to parse JSON response, using content as code:', e);
      // Fallback: treat entire content as code
      code = content;
    }

    console.log('Parsed message:', message);
    console.log('Parsed code:', code);

    return NextResponse.json({ message, code });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return NextResponse.json(
      { error: 'Failed to generate 3D code' },
      { status: 500 }
    );
  }
}
