import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({
    message: 'POST request received successfully',
    receivedData: body,
    timestamp: new Date().toISOString()
  });
}

export async function GET() {
  return NextResponse.json({
    message: 'GET request received - use POST instead',
    timestamp: new Date().toISOString()
  });
}