import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert to base64 for Cloudinary upload
    const mimeType = file.type || 'image/jpeg';
    const base64Data = `data:${mimeType};base64,${buffer.toString('base64')}`;

    // Upload to Cloudinary (Without folder parameter to prevent 403 Forbidden on strict accounts)
    const result = await cloudinary.uploader.upload(base64Data);

    return NextResponse.json({ url: result.secure_url }, { status: 200 });
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    return NextResponse.json({ error: error.message || JSON.stringify(error) || 'Failed to upload image' }, { status: 500 });
  }
}
