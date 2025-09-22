import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';
import { TwilioService } from '@/lib/twilio/service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant and check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    // Only owners and managers can configure Twilio
    if (profile.role !== 'owner' && profile.role !== 'manager') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only owners and managers can configure Twilio.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { accountSid, authToken, phoneNumber, phoneNumberSid } = body;

    if (!accountSid || !authToken || !phoneNumber || !phoneNumberSid) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate credentials first
    const twilioService = new TwilioService(profile.tenant_id);
    const validationResult = await twilioService.validateCredentials(accountSid, authToken);

    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.error || 'Invalid Twilio credentials' },
        { status: 400 }
      );
    }

    // Encrypt the auth token
    const encryptedAuthToken = encrypt(authToken);

    // Check if configuration exists
    const { data: existingConfig } = await supabase
      .from('twilio_configurations')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .single();

    let result;

    if (existingConfig) {
      // Update existing configuration
      result = await supabase
        .from('twilio_configurations')
        .update({
          account_sid: accountSid,
          auth_token: encryptedAuthToken,
          phone_number: phoneNumber,
          phone_number_sid: phoneNumberSid,
          is_active: true,
          is_verified: true,
          verified_at: new Date().toISOString(),
          webhook_base_url: process.env.NEXT_PUBLIC_APP_URL
        })
        .eq('id', existingConfig.id);
    } else {
      // Create new configuration
      result = await supabase
        .from('twilio_configurations')
        .insert({
          tenant_id: profile.tenant_id,
          account_sid: accountSid,
          auth_token: encryptedAuthToken,
          phone_number: phoneNumber,
          phone_number_sid: phoneNumberSid,
          is_active: true,
          is_verified: true,
          verified_at: new Date().toISOString(),
          webhook_base_url: process.env.NEXT_PUBLIC_APP_URL
        });
    }

    if (result.error) {
      console.error('Failed to save Twilio configuration:', result.error);
      return NextResponse.json(
        { error: 'Failed to save configuration' },
        { status: 500 }
      );
    }

    // Try to configure webhooks on the Twilio phone number
    // Note: This is optional and can fail if the service isn't ready
    let webhooksConfigured = false;
    try {
      // Create a new service instance with the credentials directly
      const webhookService = new TwilioService(profile.tenant_id);
      // Initialize with a small delay to ensure DB write is complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      const initialized = await webhookService.initialize();

      if (initialized) {
        webhooksConfigured = await webhookService.configureWebhooks(phoneNumberSid);
      }

      if (!webhooksConfigured) {
        console.warn('Webhooks will need to be configured manually in Twilio console');
      }
    } catch (webhookError) {
      console.warn('Could not configure webhooks automatically:', webhookError);
      // Don't fail the entire operation if webhook configuration fails
    }

    return NextResponse.json({
      success: true,
      message: 'Twilio configuration saved successfully',
      webhooksConfigured
    });
  } catch (error: any) {
    console.error('Twilio configure error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to configure Twilio' },
      { status: 500 }
    );
  }
}