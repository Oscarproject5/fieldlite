import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
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

    // Get forwarding number from tenant configuration
    const { data: twilioConfig } = await supabase
      .from('twilio_configurations')
      .select('forwarding_number')
      .eq('tenant_id', tenantId)
      .single();

    // Generate TwiML response WITHOUT Twilio SDK
    let twimlResponse = '<?xml version="1.0" encoding="UTF-8"?>';
    twimlResponse += '<Response>';

    if (twilioConfig?.forwarding_number) {
      // Forward the call if forwarding number is configured
      twimlResponse += '<Say voice="alice" language="en-US">Thank you for calling. Connecting you now.</Say>';
      twimlResponse += `<Dial>${twilioConfig.forwarding_number}</Dial>`;
    } else {
      // Default response if no forwarding number
      twimlResponse += '<Say voice="alice" language="en-US">Thank you for calling. Please hold while we connect you.</Say>';
      twimlResponse += '<Play loop="1">http://com.twilio.music.classical.s3.amazonaws.com/ClockworkWaltz.mp3</Play>';
    }

    twimlResponse += '</Response>';

    return new NextResponse(twimlResponse, {
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