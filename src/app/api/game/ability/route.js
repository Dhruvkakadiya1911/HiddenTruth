import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'No abilities currently active.' }, { status: 400 });
}
