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
    const { to, message, contactId, dealId, jobId } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // Initialize Twilio service
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
    const fromNumber = config?.phone_number;

    if (!fromNumber) {
      return NextResponse.json({ error: 'No phone number configured' }, { status: 400 });
    }

    // Send SMS using Twilio
    const client = twilioService.getClient();
    if (!client) {
      return NextResponse.json({ error: 'Twilio client not initialized' }, { status: 500 });
    }

    const sms = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/sms/status`
    });

    // Save the message to database
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        tenant_id: profile.tenant_id,
        thread_id: sms.sid,
        direction: 'outbound',
        channel: 'sms',
        from_address: fromNumber,
        to_address: to,
        body: message,
        sent_at: new Date().toISOString(),
        related_type: contactId ? 'contact' : dealId ? 'deal' : jobId ? 'job' : null,
        related_id: contactId || dealId || jobId || null
      });

    if (insertError) {
      console.error('Failed to save SMS to database:', insertError);
    }

    return NextResponse.json({
      success: true,
      messageSid: sms.sid,
      status: sms.status,
      to: sms.to,
      from: sms.from
    });

  } catch (error: any) {
    console.error('Failed to send SMS:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send SMS' },
      { status: 500 }
    );
  }
}