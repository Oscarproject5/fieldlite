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
      // For outbound calls, just play a message and let the call continue
      // The call is already connected between the two parties
      twimlResponse += '<Say voice="alice">Call connected.</Say>';
      // Empty response lets Twilio continue with the normal call flow
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