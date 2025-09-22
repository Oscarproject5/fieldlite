import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const tenantId = params.tenantId;
    const formData = await request.formData();
    const data: any = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    console.log('Incoming voice webhook for tenant:', tenantId, data);

    // Log incoming call
    if (data.CallSid && data.Direction === 'inbound') {
      await supabase.from('calls').insert({
        tenant_id: tenantId,
        twilio_call_sid: data.CallSid,
        from_number: data.From,
        to_number: data.To,
        direction: 'inbound',
        status: 'ringing'
      });
    }

    // Generate TwiML response
    const twiml = new twilio.twiml.VoiceResponse();

    // Simple greeting - you can customize this based on tenant settings
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Thank you for calling. Please hold while we connect you.');

    // Forward the call to a configured number (you'd fetch this from tenant settings)
    // For now, just play hold music
    twiml.play({
      loop: 1
    }, 'http://com.twilio.music.classical.s3.amazonaws.com/ClockworkWaltz.mp3');

    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  } catch (error) {
    console.error('Voice webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}