import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to test webhooks.' },
    { status: 405 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId, testType } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Verify the user has access to this tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profile?.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized access to this tenant' },
        { status: 403 }
      );
    }

    // Check if Twilio configuration exists for this tenant
    const { data: twilioConfig } = await supabase
      .from('twilio_configurations')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (!twilioConfig || !twilioConfig.is_active) {
      return NextResponse.json(
        { error: 'Twilio is not configured for this tenant' },
        { status: 400 }
      );
    }

    // Test the webhook endpoints by simulating a Twilio request
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000';
    const voiceWebhookUrl = `${baseUrl}/api/twilio/webhook/${tenantId}/voice`;
    const statusWebhookUrl = `${baseUrl}/api/twilio/webhook/${tenantId}/status`;

    // Create a test payload similar to what Twilio would send
    const testPayload = {
      CallSid: 'TEST_' + Math.random().toString(36).substr(2, 9),
      From: '+1234567890',
      To: twilioConfig.phone_number || '+1234567890',
      CallStatus: 'ringing',
      Direction: 'inbound',
      AccountSid: twilioConfig.account_sid
    };

    let webhookTestResult = { voice: false, status: false };

    // Test voice webhook
    try {
      const voiceResponse = await fetch(voiceWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(testPayload).toString()
      });

      webhookTestResult.voice = voiceResponse.ok;
    } catch (error) {
      console.error('Voice webhook test failed:', error);
    }

    // Test status webhook
    try {
      const statusResponse = await fetch(statusWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          ...testPayload,
          CallStatus: 'completed',
          CallDuration: '60'
        }).toString()
      });

      webhookTestResult.status = statusResponse.ok;
    } catch (error) {
      console.error('Status webhook test failed:', error);
    }

    // Return the results
    return NextResponse.json({
      success: true,
      message: 'Webhook test completed',
      webhookUrls: {
        voice: voiceWebhookUrl,
        status: statusWebhookUrl
      },
      testResults: webhookTestResult,
      configuration: {
        tenantId,
        phoneNumber: twilioConfig.phone_number,
        isActive: twilioConfig.is_active
      }
    });

  } catch (error: any) {
    console.error('Webhook test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to test webhooks'
      },
      { status: 500 }
    );
  }
}