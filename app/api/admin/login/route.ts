import { NextRequest, NextResponse } from 'next/server';
import { createAdminSession, isAdminCredentials } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');

    if (!isAdminCredentials(username, password)) {
      return NextResponse.json({ error: 'Invalid admin username or password.' }, { status: 401 });
    }

    await createAdminSession();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unable to process login.' }, { status: 400 });
  }
}
