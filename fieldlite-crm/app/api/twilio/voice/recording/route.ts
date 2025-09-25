import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Webhook endpoint called when a call recording is ready
 * Updates the call record with the recording URL
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

    console.log('Recording ready:', {
      callSid,
      recordingSid,
      status: recordingStatus,
      duration: recordingDuration
    });

    const supabase = await createClient();

    // Update call record with recording information
    const { data: call, error: fetchError } = await supabase
      .from('calls')
      .select('id')
      .eq('twilio_call_sid', callSid)
      .single();

    if (fetchError || !call) {
      console.error('Call not found for recording:', callSid);
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Update the call with recording information
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