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

    console.log('Status webhook for tenant:', tenantId, data);

    const callSid = data.CallSid;
    const callStatus = data.CallStatus;

    if (!callSid) {
      return NextResponse.json({ error: 'Missing CallSid' }, { status: 400 });
    }

    // Map Twilio status to our enum
    const statusMap: { [key: string]: string } = {
      'queued': 'queued',
      'initiated': 'queued',
      'ringing': 'ringing',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'busy': 'busy',
      'failed': 'failed',
      'no-answer': 'no-answer',
      'canceled': 'canceled'
    };

    const updateData: any = {
      status: statusMap[callStatus] || callStatus
    };

    // Add duration and timestamps for completed calls
    if (callStatus === 'completed') {
      if (data.CallDuration) {
        updateData.duration_seconds = parseInt(data.CallDuration);
      }
      updateData.ended_at = new Date().toISOString();

      // Add price information if available
      if (data.Price) {
        updateData.price = parseFloat(data.Price);
        updateData.price_unit = data.PriceUnit || 'USD';
      }
    }

    // Handle recording URL if present
    if (data.RecordingUrl) {
      updateData.recording_url = data.RecordingUrl;
      updateData.recording_duration = data.RecordingDuration ? parseInt(data.RecordingDuration) : null;
    }

    // Update call record
    const { error } = await supabase
      .from('calls')
      .update(updateData)
      .eq('twilio_call_sid', callSid)
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Failed to update call status:', error);
      // Don't fail the webhook, just log the error
    }

    // Try to log the event (optional - don't fail if table doesn't exist)
    try {
      const { data: callRecord } = await supabase
        .from('calls')
        .select('id')
        .eq('twilio_call_sid', callSid)
        .single();

      if (callRecord?.id) {
        await supabase.from('call_events').insert({
          call_id: callRecord.id,
          event_type: `status_${callStatus}`,
          event_data: data,
          twilio_callback_source: data.CallbackSource || 'status_callback'
        });
      }
    } catch (eventError) {
      // Ignore event logging errors - table might not exist
      console.log('Could not log call event (table may not exist):', eventError);
    }

    // Always return success to Twilio
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Status webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}