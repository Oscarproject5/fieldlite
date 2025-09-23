import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenant_id');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id parameter is required' }, { status: 400 });
  }

  // Dynamically determine the base URL
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('host') || 'localhost:3000';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
  const localUrl = `http://${host}`;

  const webhookUrls = {
    production: {
      voice: `${baseUrl}/api/twilio/webhook/${tenantId}/voice`,
      status: `${baseUrl}/api/twilio/webhook/${tenantId}/status`,
    },
    local: {
      voice: `${localUrl}/api/twilio/webhook/${tenantId}/voice`,
      status: `${localUrl}/api/twilio/webhook/${tenantId}/status`,
    },
    tenantId: tenantId,
    instructions: [
      '1. Log in to Twilio Console (console.twilio.com)',
      '2. Go to Phone Numbers → Manage → Active Numbers',
      '3. Click on your phone number',
      '4. In the Voice Configuration section:',
      `   - Set "A call comes in" webhook to the voice URL above`,
      '   - Set HTTP method to: POST',
      `   - Set "Call status changes" webhook to the status URL above`,
      '   - Set HTTP method to: POST',
      '5. Click Save',
      '',
      'For local testing with ngrok:',
      '1. Run: ngrok http 3001',
      '2. Replace localhost URLs with ngrok URL'
    ]
  };

  return NextResponse.json(webhookUrls);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}