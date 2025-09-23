import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const body = await request.json();
    const { to, from } = body;

    if (!to) {
      return NextResponse.json(
        { error: 'Recipient phone number is required' },
        { status: 400 }
      );
    }

    // Get Twilio configuration for this tenant
    const { data: twilioConfig } = await supabase
      .from('twilio_configurations')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (!twilioConfig || !twilioConfig.is_active) {
      return NextResponse.json(
        { error: 'Twilio is not configured for this tenant' },
        { status: 400 }
      );
    }

    // Decrypt the auth token
    const { decrypt } = await import('@/lib/encryption');
    const authToken = decrypt(twilioConfig.auth_token, twilioConfig.account_sid);

    // Use the tenant's Twilio phone number as the caller ID
    const fromNumber = from || twilioConfig.phone_number;
    const toNumber = to;

    // Determine the base URL for webhooks
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    // Create webhook URL for this call
    const statusCallback = `${baseUrl}/api/twilio/webhook/${profile.tenant_id}/status`;

    // Make the call using Twilio API
    const authString = Buffer.from(`${twilioConfig.account_sid}:${authToken}`).toString('base64');

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioConfig.account_sid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          'To': toNumber,
          'From': fromNumber,
          'Url': `${baseUrl}/api/twilio/webhook/${profile.tenant_id}/voice/outbound`,
          'StatusCallback': statusCallback,
          'StatusCallbackMethod': 'POST',
          'StatusCallbackEvent': 'initiated,ringing,answered,completed',
          'Record': 'false',
          'MachineDetection': 'Enable',
          'MachineDetectionTimeout': '30'
        }).toString()
      }
    );

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.json();
      console.error('Twilio API error:', errorData);
      return NextResponse.json(
        {
          error: errorData.message || 'Failed to initiate call',
          details: errorData
        },
        { status: 500 }
      );
    }

    const callData = await twilioResponse.json();

    // Log the outbound call in database
    await supabase.from('calls').insert({
      tenant_id: profile.tenant_id,
      twilio_call_sid: callData.sid,
      from_number: fromNumber,
      to_number: toNumber,
      direction: 'outbound',
      status: 'initiated',
      initiated_by: user.id
    });

    return NextResponse.json({
      success: true,
      message: 'Call initiated successfully',
      callSid: callData.sid,
      to: callData.to,
      from: callData.from,
      status: callData.status
    });

  } catch (error: any) {
    console.error('Outbound call error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate call' },
      { status: 500 }
    );
  }
}