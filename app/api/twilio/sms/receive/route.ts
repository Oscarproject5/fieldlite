import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import twilio from 'twilio';

const MessagingResponse = twilio.twiml.MessagingResponse;

/**
 * Webhook endpoint for receiving SMS messages
 * Twilio sends a POST request here when someone texts your number
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    // Extract SMS data from Twilio webhook
    const messageSid = params.get('MessageSid');
    const from = params.get('From');
    const to = params.get('To');
    const messageBody = params.get('Body');
    const numMedia = params.get('NumMedia');

    console.log('SMS received:', {
      sid: messageSid,
      from,
      to,
      body: messageBody
    });

    const supabase = await createClient();

    // Find the tenant based on the Twilio phone number
    const { data: twilioConfig } = await supabase
      .from('twilio_configurations')
      .select('tenant_id')
      .eq('phone_number', to)
      .single();

    if (twilioConfig) {
      // Find or create contact based on phone number
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('tenant_id', twilioConfig.tenant_id)
        .contains('phones', [from])
        .single();

      // Save the message to database
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          tenant_id: twilioConfig.tenant_id,
          thread_id: messageSid,
          direction: 'inbound',
          channel: 'sms',
          from_address: from,
          to_address: to,
          body: messageBody,
          sent_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          related_type: contact ? 'contact' : null,
          related_id: contact?.id || null
        });

      if (insertError) {
        console.error('Failed to save SMS:', insertError);
      }

      // Auto-reply options (customize as needed)
      const twiml = new MessagingResponse();

      // Example auto-replies based on keywords
      const lowerBody = messageBody?.toLowerCase() || '';

      if (lowerBody.includes('hours') || lowerBody.includes('open')) {
        twiml.message('We are open Monday-Friday 9AM-5PM. How can we help you?');
      } else if (lowerBody.includes('stop')) {
        // Handle opt-out
        twiml.message('You have been unsubscribed. Reply START to resubscribe.');
      } else if (lowerBody.includes('help')) {
        twiml.message('Reply HOURS for business hours, CONTACT for contact info, or call us at (833) 949-0539');
      } else {
        // Default auto-reply
        twiml.message('Thanks for your message! We\'ll get back to you shortly. For immediate assistance, call (833) 949-0539');
      }

      // Return TwiML response
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    } else {
      // No tenant found, send generic response
      const twiml = new MessagingResponse();
      twiml.message('This number is not currently in service.');

      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    }

  } catch (error: any) {
    console.error('Error processing SMS:', error);

    // Return empty TwiML response on error
    const twiml = new MessagingResponse();
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  }
}