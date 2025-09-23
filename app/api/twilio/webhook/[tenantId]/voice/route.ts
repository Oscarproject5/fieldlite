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
      // Add timeout and callerId for better call handling
      twimlResponse += `<Dial timeout="30" callerId="${data.To || '+18339490539'}">${twilioConfig.forwarding_number}</Dial>`;
      // Add a message if the forwarding fails
      twimlResponse += '<Say voice="alice" language="en-US">Sorry, we could not connect your call. Please try again later.</Say>';
    } else {
      // Default response if no forwarding number - just play hold music
      twimlResponse += '<Say voice="alice" language="en-US">Thank you for calling. Your forwarding number is not configured. Please contact support.</Say>';
      twimlResponse += '<Pause length="2"/>';
      twimlResponse += '<Say voice="alice" language="en-US">Goodbye.</Say>';
      twimlResponse += '<Hangup/>';
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