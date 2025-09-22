import { NextRequest, NextResponse } from 'next/server';
import { extractCallData, mapTwilioStatus } from '@/lib/twilio/webhook-validator';
import { createClient } from '@/lib/supabase/server';

/**
 * Webhook endpoint called when call status changes
 * Updates the call record in the database
 */
export async function POST(request: NextRequest) {
  try {
    const callData = await extractCallData(request);
    const supabase = await createClient();

    if (!callData.callSid) {
      return NextResponse.json({ error: 'No call SID provided' }, { status: 400 });
    }

    // Map Twilio status to our database enum
    const status = mapTwilioStatus(callData.callStatus!);

    console.log('Call status update:', {
      sid: callData.callSid,
      status: callData.callStatus,
      mappedStatus: status
    });

    // Check if call record exists
    const { data: existingCall } = await supabase
      .from('calls')
      .select('id, tenant_id')
      .eq('twilio_call_sid', callData.callSid)
      .single();

    if (existingCall) {
      // Update existing call record
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      // Add additional data based on status
      if (callData.callStatus === 'in-progress') {
        updateData.answered_at = new Date().toISOString();
      }

      if (callData.callStatus === 'completed') {
        updateData.ended_at = new Date().toISOString();
        if (callData.duration) {
          updateData.duration_seconds = parseInt(callData.duration);
        }
        if (callData.price) {
          updateData.price = parseFloat(callData.price);
          updateData.price_unit = callData.priceUnit || 'USD';
        }
      }

      const { error: updateError } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', existingCall.id);

      if (updateError) {
        console.error('Failed to update call record:', updateError);
        return NextResponse.json({ error: 'Failed to update call' }, { status: 500 });
      }

      // Create call event record
      await supabase
        .from('call_events')
        .insert({
          call_id: existingCall.id,
          event_type: callData.callStatus,
          event_data: callData,
          twilio_callback_source: 'status'
        });

    } else if (callData.callStatus === 'ringing' || callData.callStatus === 'initiated') {
      // For new calls (usually inbound), create a new record
      // Try to find the tenant based on the phone number
      const { data: twilioConfig } = await supabase
        .from('twilio_configurations')
        .select('tenant_id')
        .eq('phone_number', callData.to)
        .single();

      if (twilioConfig) {
        // Create new call record
        const { data: newCall, error: insertError } = await supabase
          .from('calls')
          .insert({
            tenant_id: twilioConfig.tenant_id,
            twilio_call_sid: callData.callSid,
            from_number: callData.from!,
            to_number: callData.to!,
            direction: callData.direction === 'inbound' ? 'inbound' : 'outbound',
            status,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('Failed to create call record:', insertError);
          return NextResponse.json({ error: 'Failed to create call' }, { status: 500 });
        }

        // Create initial call event
        if (newCall) {
          await supabase
            .from('call_events')
            .insert({
              call_id: newCall.id,
              event_type: callData.callStatus,
              event_data: callData,
              twilio_callback_source: 'status'
            });
        }
      } else {
        console.warn('No tenant found for phone number:', callData.to);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error in voice status webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process call status' },
      { status: 500 }
    );
  }
}