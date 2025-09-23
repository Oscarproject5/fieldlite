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

    console.log('Outbound call webhook for tenant:', tenantId);

    // Get the forwarding number from configuration (this is who initiated the call)
    const { data: twilioConfig } = await supabase
      .from('twilio_configurations')
      .select('forwarding_number')
      .eq('tenant_id', tenantId)
      .single();

    // Generate TwiML response for outbound call
    let twimlResponse = '<?xml version="1.0" encoding="UTF-8"?>';
    twimlResponse += '<Response>';

    if (data.AnsweredBy === 'machine_start' || data.AnsweredBy === 'fax') {
      // If it's a machine or fax, hang up
      twimlResponse += '<Say voice="alice">This call requires a human. Goodbye.</Say>';
      twimlResponse += '<Hangup/>';
    } else {
      // Connect the call to the forwarding number (the person who initiated the call)
      if (twilioConfig?.forwarding_number) {
        twimlResponse += '<Say voice="alice">Connecting your call.</Say>';
        twimlResponse += `<Dial>${twilioConfig.forwarding_number}</Dial>`;
      } else {
        // If no forwarding number, just announce and hang up
        twimlResponse += '<Say voice="alice">This is a call from your business phone system.</Say>';
        twimlResponse += '<Pause length="2"/>';
        twimlResponse += '<Say voice="alice">Please configure your forwarding number to complete calls.</Say>';
        twimlResponse += '<Hangup/>';
      }
    }

    twimlResponse += '</Response>';

    return new NextResponse(twimlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  } catch (error) {
    console.error('Outbound voice webhook error:', error);

    // Return a basic TwiML response even on error
    const errorResponse = '<?xml version="1.0" encoding="UTF-8"?>' +
      '<Response>' +
      '<Say voice="alice">We are unable to connect your call at this time. Please try again.</Say>' +
      '<Hangup/>' +
      '</Response>';

    return new NextResponse(errorResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  }
}