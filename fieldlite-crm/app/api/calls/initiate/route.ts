import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TwilioService } from '@/lib/twilio/service';

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
    const { to, from, contactId, dealId, jobId, record = true } = body; // Default to recording calls

    if (!to) {
      return NextResponse.json({ error: 'To number is required' }, { status: 400 });
    }

    // Initialize Twilio service for the tenant
    const twilioService = new TwilioService(profile.tenant_id);
    const initialized = await twilioService.initialize();

    if (!initialized) {
      return NextResponse.json(
        { error: 'Twilio not configured. Please set up your Twilio account in settings.' },
        { status: 400 }
      );
    }

    // Get the configured phone number
    const config = twilioService.getConfig();
    const fromNumber = from || config?.phone_number;

    if (!fromNumber) {
      return NextResponse.json({ error: 'No phone number configured' }, { status: 400 });
    }

    // Create call record in database first
    const { data: callRecord, error: callError } = await supabase
      .from('calls')
      .insert({
        tenant_id: profile.tenant_id,
        from_number: fromNumber,
        to_number: to,
        direction: 'outbound',
        status: 'queued',
        contact_id: contactId || null,
        deal_id: dealId || null,
        job_id: jobId || null,
        user_id: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (callError || !callRecord) {
      console.error('Failed to create call record:', callError);
      return NextResponse.json({ error: 'Failed to create call record' }, { status: 500 });
    }

    // Make the call with webhooks configured
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const call = await twilioService.makeCall({
      to,
      from: fromNumber,
      url: `${baseUrl}/api/twilio/voice/answer`,
      statusCallback: `${baseUrl}/api/twilio/voice/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      record: record,
      recordingStatusCallback: record ? `${baseUrl}/api/twilio/voice/recording` : undefined,
      recordingStatusCallbackMethod: 'POST'
    });

    // Update call record with Twilio call SID
    await supabase
      .from('calls')
      .update({
        twilio_call_sid: call.sid,
        status: 'queued'
      })
      .eq('id', callRecord.id);

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      status: call.status
    });
  } catch (error: any) {
    console.error('Failed to initiate call:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate call' },
      { status: 500 }
    );
  }
}