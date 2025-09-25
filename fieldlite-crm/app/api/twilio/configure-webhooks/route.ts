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
    { error: 'Method not allowed. Use POST to configure webhooks.' },
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

    // Get user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    // Get Twilio configuration
    const { data: twilioConfig } = await supabase
      .from('twilio_configurations')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (!twilioConfig || !twilioConfig.is_active) {
      return NextResponse.json(
        { error: 'Twilio is not configured. Please complete setup first.' },
        { status: 400 }
      );
    }

    // Decrypt the auth token using the account SID as salt
    const { decrypt } = await import('@/lib/encryption');
    let authToken: string;
    try {
      authToken = decrypt(twilioConfig.auth_token, twilioConfig.account_sid);
    } catch (decryptError) {
      console.warn('Twilio auth token decrypt failed during webhook configuration; falling back to stored value. Re-save Twilio settings to encrypt.', { tenantId: profile.tenant_id, error: decryptError instanceof Error ? decryptError.message : decryptError });
      authToken = twilioConfig.auth_token;
    }

    // Generate webhook URLs dynamically based on the current domain
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const voiceWebhookUrl = `${baseUrl}/api/twilio/webhook/${profile.tenant_id}/voice`;
    const statusWebhookUrl = `${baseUrl}/api/twilio/webhook/${profile.tenant_id}/status`;

    // Configure webhooks using Twilio API
    const authString = Buffer.from(`${twilioConfig.account_sid}:${authToken}`).toString('base64');

    // Update the phone number configuration in Twilio
    const updateUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioConfig.account_sid}/IncomingPhoneNumbers/${twilioConfig.phone_number_sid}.json`;

    const response = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        VoiceUrl: voiceWebhookUrl,
        VoiceMethod: 'POST',
        StatusCallback: statusWebhookUrl,
        StatusCallbackMethod: 'POST',
        VoiceFallbackUrl: voiceWebhookUrl,
        VoiceFallbackMethod: 'POST'
      }).toString()
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Twilio API error:', errorData);
      return NextResponse.json(
        {
          error: 'Failed to configure webhooks in Twilio',
          details: errorData,
          manual: true,
          webhookUrls: {
            voice: voiceWebhookUrl,
            status: statusWebhookUrl
          }
        },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Update the webhook URLs in our database
    await supabase
      .from('twilio_configurations')
      .update({
        webhook_base_url: baseUrl,
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', profile.tenant_id);

    return NextResponse.json({
      success: true,
      message: 'Webhooks configured successfully!',
      webhookUrls: {
        voice: voiceWebhookUrl,
        status: statusWebhookUrl
      },
      phoneNumber: data.phone_number,
      friendlyName: data.friendly_name
    });

  } catch (error: any) {
    console.error('Configure webhooks error:', error);

    // If automatic configuration fails, return manual setup instructions
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profile?.tenant_id) {
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const host = request.headers.get('host') || 'localhost:3000';
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
        const voiceWebhookUrl = `${baseUrl}/api/twilio/webhook/${profile.tenant_id}/voice`;
        const statusWebhookUrl = `${baseUrl}/api/twilio/webhook/${profile.tenant_id}/status`;

        return NextResponse.json({
          success: false,
          error: 'Automatic configuration failed. Please configure manually.',
          manual: true,
          webhookUrls: {
            voice: voiceWebhookUrl,
            status: statusWebhookUrl
          },
          instructions: [
            'Log in to your Twilio Console',
            'Go to Phone Numbers → Manage → Active Numbers',
            'Click on your phone number',
            'In the Voice Configuration section:',
            `- Set "A call comes in" webhook to: ${voiceWebhookUrl}`,
            '- Set HTTP method to: POST',
            `- Set "Call status changes" webhook to: ${statusWebhookUrl}`,
            '- Set HTTP method to: POST',
            'Click Save'
          ]
        }, { status: 200 });
      }
    }

    return NextResponse.json(
      { error: error.message || 'Failed to configure webhooks' },
      { status: 500 }
    );
  }
}
