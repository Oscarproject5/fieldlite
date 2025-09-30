import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import twilio from 'twilio';
import { validateTwilioSignature, extractWebhookParams } from '@/lib/security/webhook-validator';
import { rateLimit, RateLimitPresets, getRateLimitHeaders } from '@/lib/security/rate-limiter';

const MessagingResponse = twilio.twiml.MessagingResponse;

/**
 * Webhook endpoint for receiving SMS messages
 * Twilio sends a POST request here when someone texts your number
 *
 * Security features:
 * - Webhook signature validation to prevent forged requests
 * - Rate limiting to prevent DoS attacks
 * - Auto-reply control via database configuration
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

    // Rate limit per phone number to prevent abuse
    const rateLimitResult = await rateLimit(RateLimitPresets.SMS_RECEIVE(from || 'unknown'));
    if (!rateLimitResult.success) {
      console.warn('Rate limit exceeded for SMS from:', from);
      const twiml = new MessagingResponse();
      return new NextResponse(twiml.toString(), {
        status: 429,
        headers: {
          'Content-Type': 'text/xml',
          ...getRateLimitHeaders(rateLimitResult, 60)
        }
      });
    }

    const supabase = await createClient();

    // Get Twilio auth token for signature validation
    const { data: twilioConfig } = await supabase
      .from('twilio_configurations')
      .select('tenant_id, auth_token_encrypted, encryption_key_id')
      .eq('phone_number', to)
      .single();

    if (!twilioConfig) {
      console.error('No Twilio configuration found for number:', to);
      const twiml = new MessagingResponse();
      twiml.message('This number is not currently in service.');
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // Validate Twilio signature
    const signature = request.headers.get('X-Twilio-Signature');
    const url = request.url;

    if (signature && twilioConfig.auth_token_encrypted) {
      // Decrypt auth token for validation
      const { data: decrypted } = await supabase.rpc('decrypt_secret', {
        encrypted_data: twilioConfig.auth_token_encrypted,
        key_id: twilioConfig.encryption_key_id
      });

      const webhookParams = extractWebhookParams(body);
      const isValid = validateTwilioSignature(
        signature,
        url,
        webhookParams,
        decrypted
      );

      if (!isValid) {
        console.error('Invalid Twilio signature for SMS webhook');
        return new NextResponse('Unauthorized', { status: 401 });
      }
    } else {
      console.warn('No signature validation performed - missing signature or auth token');
    }

    console.log('SMS received:', {
      sid: messageSid,
      from,
      to,
      body: messageBody
    });

    // twilioConfig already fetched above for signature validation
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

      // Check tenant settings for auto-reply configuration
      const { data: tenantSettings } = await supabase
        .from('tenant_settings')
        .select('sms_auto_reply_enabled, sms_auto_reply_message, sms_keyword_responses')
        .eq('tenant_id', twilioConfig.tenant_id)
        .single();

      const twiml = new MessagingResponse();

      // Handle auto-replies if enabled
      if (tenantSettings?.sms_auto_reply_enabled) {
        const lowerBody = messageBody?.toLowerCase() || '';

        // Check for keyword-based responses first
        const keywordResponses = tenantSettings.sms_keyword_responses || {};
        let replied = false;

        for (const [keyword, response] of Object.entries(keywordResponses)) {
          if (lowerBody.includes(keyword.toLowerCase())) {
            twiml.message(response as string);
            replied = true;
            break;
          }
        }

        // If no keyword matched, send default auto-reply
        if (!replied && tenantSettings.sms_auto_reply_message) {
          twiml.message(tenantSettings.sms_auto_reply_message);
        }
      }

      // Return TwiML response
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