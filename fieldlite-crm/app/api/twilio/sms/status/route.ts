import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Webhook endpoint for SMS delivery status updates
 * Tracks if messages were delivered, failed, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const messageSid = params.get('MessageSid');
    const messageStatus = params.get('MessageStatus');
    const from = params.get('From');
    const to = params.get('To');
    const errorCode = params.get('ErrorCode');
    const errorMessage = params.get('ErrorMessage');

    console.log('SMS status update:', {
      sid: messageSid,
      status: messageStatus,
      from,
      to,
      error: errorCode
    });

    const supabase = await createClient();

    // Update message status in database
    if (messageSid) {
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          updated_at: new Date().toISOString(),
          delivered_at: messageStatus === 'delivered' ? new Date().toISOString() : null,
          // Store error info in attachments field as JSON
          attachments: errorCode ? { error: { code: errorCode, message: errorMessage } } : null
        })
        .eq('thread_id', messageSid);

      if (updateError) {
        console.error('Failed to update message status:', updateError);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error processing SMS status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process SMS status' },
      { status: 500 }
    );
  }
}