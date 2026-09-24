import { NextResponse } from 'next/server';
import { getWhatsAppConfig } from '@/lib/firestore';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const config = await getWhatsAppConfig();
    const apiUrl = config?.apiUrl || '';

    // Only proxy logout to local server
    if (!apiUrl || apiUrl.includes('127.0.0.1') || apiUrl.includes('localhost')) {
      const res = await fetch('http://127.0.0.1:3001/logout', { 
        method: 'POST',
        cache: 'no-store' 
      });
      const data = await res.json();
      return NextResponse.json(data);
    }
    return NextResponse.json({ success: false, message: 'Not using local server' });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
