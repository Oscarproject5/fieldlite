import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateTwilioSignature, extractWebhookParams } from '@/lib/security/webhook-validator';
import { rateLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';

/**
 * Webhook endpoint called when a call recording is ready
 * Updates the call record with the recording URL
 *
 * Security features:
 * - Webhook signature validation
 * - Rate limiting per call SID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const callSid = params.get('CallSid');
    const recordingUrl = params.get('RecordingUrl');
    const recordingSid = params.get('RecordingSid');
    const recordingDuration = params.get('RecordingDuration');
    const recordingStatus = params.get('RecordingStatus');

    if (!callSid || !recordingUrl) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Rate limit per call SID to prevent webhook replay attacks
    const rateLimitResult = await rateLimit({
      identifier: `recording:${callSid}`,
      limit: 10,
      window: 60,
      prefix: 'webhook'
    });

    if (!rateLimitResult.success) {
      console.warn('Rate limit exceeded for recording webhook:', callSid);
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult, 10)
        }
      );
    }

    console.log('Recording ready:', {
      callSid,
      recordingSid,
      status: recordingStatus,
      duration: recordingDuration
    });

    const supabase = await createClient();

    // Get call to find tenant and validate signature
    const { data: call, error: fetchError } = await supabase
      .from('calls')
      .select('id, tenant_id')
      .eq('twilio_call_sid', callSid)
      .single();

    if (fetchError || !call) {
      console.error('Call not found for recording:', callSid);
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Get Twilio auth token for signature validation
    const { data: twilioConfig } = await supabase
      .from('twilio_configurations')
      .select('auth_token_encrypted, encryption_key_id')
      .eq('tenant_id', call.tenant_id)
      .single();

    // Validate Twilio signature
    const signature = request.headers.get('X-Twilio-Signature');
    const url = request.url;

    if (signature && twilioConfig?.auth_token_encrypted) {
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
        console.error('Invalid Twilio signature for recording webhook');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      console.warn('No signature validation performed - missing signature or auth token');
    }

    // call already fetched above, now update with recording information
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        recording_url: recordingUrl,
        recording_duration: recordingDuration ? parseInt(recordingDuration) : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', call.id);

    if (updateError) {
      console.error('Failed to update call with recording:', updateError);
      return NextResponse.json({ error: 'Failed to update recording' }, { status: 500 });
    }

    // Create a call event for the recording
    await supabase
      .from('call_events')
      .insert({
        call_id: call.id,
        event_type: 'recording-completed',
        event_data: {
          recordingSid,
          recordingUrl,
          recordingDuration,
          recordingStatus
        },
        twilio_callback_source: 'recording'
      });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error in recording webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process recording' },
      { status: 500 }
    );
  }
}