import { NextResponse } from 'next/server';
import { getWhatsAppConfig } from '@/lib/firestore';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Always attempt to logout the local node server, regardless of current config
    const res = await fetch('http://127.0.0.1:3001/logout', { 
      method: 'POST',
      cache: 'no-store' 
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
