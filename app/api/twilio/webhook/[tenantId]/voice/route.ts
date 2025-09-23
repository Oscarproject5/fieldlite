import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    // Check if environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      // Return basic response without database
      let basicResponse = '<?xml version="1.0" encoding="UTF-8"?>';
      basicResponse += '<Response>';
      basicResponse += '<Say voice="alice">Thank you for calling. Service is temporarily unavailable.</Say>';
      basicResponse += '</Response>';

      return new NextResponse(basicResponse, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' }
      });
    }

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

    console.log('Incoming voice webhook for tenant:', tenantId);

    // Try to log incoming call (but don't fail if it doesn't work)
    try {
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
    } catch (dbError) {
      console.error('Could not log call:', dbError);
      // Continue without failing
    }

    // Try to get FULL configuration from tenant
    let twilioConfig = null;
    try {
      const result = await supabase
        .from('twilio_configurations')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      twilioConfig = result.data;
    } catch (configError) {
      console.error('Could not fetch config:', configError);
      // Continue without config
    }

    // Generate TwiML response WITHOUT Twilio SDK
    let twimlResponse = '<?xml version="1.0" encoding="UTF-8"?>';
    twimlResponse += '<Response>';

    if (twilioConfig?.forwarding_number) {
      // Forward the call if forwarding number is configured
      twimlResponse += '<Say voice="alice" language="en-US">Thank you for calling. Connecting you now.</Say>';
      // Use the configured phone number as callerId (the Twilio number that received the call)
      const callerId = twilioConfig.phone_number || data.To || data.Called;
      twimlResponse += `<Dial timeout="30" callerId="${callerId}">${twilioConfig.forwarding_number}</Dial>`;
      // Add a message if the forwarding fails
      twimlResponse += '<Say voice="alice" language="en-US">Sorry, we could not connect your call. Please try again later.</Say>';
    } else {
      // Default response if no forwarding number configured by user
      twimlResponse += '<Say voice="alice" language="en-US">Thank you for calling. This number is not yet configured. Please contact the administrator.</Say>';
      twimlResponse += '<Pause length="2"/>';
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