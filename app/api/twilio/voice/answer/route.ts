import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { extractCallData } from '@/lib/twilio/webhook-validator';
import { createClient } from '@/lib/supabase/server';

const VoiceResponse = twilio.twiml.VoiceResponse;

/**
 * Webhook endpoint called when a call is initiated
 * Returns TwiML instructions for how to handle the call
 */
export async function POST(request: NextRequest) {
  try {
    const callData = await extractCallData(request);
    const supabase = await createClient();

    // Create a new TwiML response
    const twiml = new VoiceResponse();

    // Determine if this is an outbound or inbound call
    if (callData.direction === 'outbound-api') {
      // For outbound calls, just dial the number
      // The call will connect to the destination number
      twiml.dial({
        callerId: callData.from,
        record: 'record-from-ringing-dual', // Record both sides
        recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/recording`,
        recordingStatusCallbackMethod: 'POST'
      }, callData.to!);

      // Add a status callback to track the call
      twiml.dial().setAttribute('action', `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/status`);
    } else {
      // For inbound calls, get forwarding number from the database
      let forwardToNumber = process.env.FORWARD_PHONE_NUMBER || '+1234567890'; // Default fallback

      // Try to get forwarding number from the database based on the phone number being called
      try {
        // Find the tenant by matching the Twilio phone number
        const { data: twilioConfig } = await supabase
          .from('twilio_configurations')
          .select('forwarding_number')
          .eq('phone_number', callData.to)
          .eq('is_active', true)
          .single();

        if (twilioConfig?.forwarding_number) {
          forwardToNumber = twilioConfig.forwarding_number;
          console.log('Using forwarding number from database:', forwardToNumber);
        } else {
          console.log('No forwarding number found in database, using default');
        }
      } catch (error) {
        console.error('Error fetching forwarding number:', error);
      }

      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Thank you for calling. Connecting you now.');

      twiml.dial({
        callerId: callData.from, // Show the original caller's number
        record: 'record-from-ringing-dual',
        recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/recording`,
        recordingStatusCallbackMethod: 'POST',
        timeout: 30
      }, forwardToNumber);
    }

    // Log the call initiation
    console.log('Call initiated:', {
      sid: callData.callSid,
      from: callData.from,
      to: callData.to,
      direction: callData.direction
    });

    // Return TwiML response
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    });

  } catch (error: any) {
    console.error('Error in voice answer webhook:', error);

    // Return a basic TwiML response even on error
    const errorTwiml = new VoiceResponse();
    errorTwiml.say('We are experiencing technical difficulties. Please try again later.');
    errorTwiml.hangup();

    return new NextResponse(errorTwiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  }
}