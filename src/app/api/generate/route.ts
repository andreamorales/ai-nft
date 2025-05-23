import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN as string
});

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // Run the Flux model
    const prediction = await replicate.predictions.create({
      model: "black-forest-labs/flux-1.1-pro",
      input: {
        prompt: prompt,
        width: 1024,
        height: 1024,
        output_format: "png",
        output_quality: 1,
        safety_tolerance: 1
      }
    });

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 30;
    let finalPrediction;

    while (attempts < maxAttempts) {
      finalPrediction = await replicate.predictions.get(prediction.id);

      if (finalPrediction.status === 'succeeded') {
        break;
      } else if (finalPrediction.status === 'failed' || finalPrediction.error) {
        throw new Error(finalPrediction.error || 'Failed to generate image');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!finalPrediction || finalPrediction.status !== 'succeeded') {
      throw new Error('Generation timed out after 30 seconds');
    }

    // Get the generated image
    const imageUrl = finalPrediction.output;
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch generated image');
    }

    // Stream the image back to the client
    const imageBlob = await imageResponse.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'image/png'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 