import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';
import { TwilioService } from '@/lib/twilio/service';

// Runtime configuration for Vercel
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to configure Twilio.' },
    { status: 405 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('Auth check - User:', user?.id, 'Error:', authError?.message);

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return NextResponse.json({
        error: 'Unauthorized. Please log in again.',
        details: authError?.message
      }, { status: 401 });
    }

    // Get user's tenant and check permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    console.log('Profile lookup - Profile:', profile, 'Error:', profileError?.message);

    if (profileError || !profile?.tenant_id) {
      console.error('Profile/tenant lookup failed:', profileError);
      return NextResponse.json({
        error: 'No tenant found for user',
        details: profileError?.message
      }, { status: 400 });
    }

    // Only owners and managers can configure Twilio
    if (profile.role !== 'owner' && profile.role !== 'manager') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only owners and managers can configure Twilio.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { accountSid, authToken, phoneNumber, phoneNumberSid, forwardingNumber, updateForwardingOnly } = body;

    // If only updating forwarding number
    if (updateForwardingOnly) {
      console.log('Updating forwarding number for tenant:', profile.tenant_id);
      console.log('New forwarding number:', forwardingNumber);

      if (!forwardingNumber) {
        return NextResponse.json(
          { error: 'Forwarding number is required' },
          { status: 400 }
        );
      }

      // Check if a configuration exists first
      const { data: existingConfig, error: fetchError } = await supabase
        .from('twilio_configurations')
        .select('id, tenant_id, phone_number')
        .eq('tenant_id', profile.tenant_id)
        .single();

      console.log('Existing config lookup result:', { existingConfig, fetchError });

      if (fetchError || !existingConfig) {
        console.error('No existing configuration found:', fetchError);
        return NextResponse.json(
          { error: 'Please complete the Twilio setup first before configuring forwarding number' },
          { status: 400 }
        );
      }

      // Update only the forwarding number
      console.log('Attempting to update forwarding number for config ID:', existingConfig.id);
      const { data: updateData, error: updateError } = await supabase
        .from('twilio_configurations')
        .update({
          forwarding_number: forwardingNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConfig.id)
        .select();

      console.log('Update result:', { updateData, updateError });

      if (updateError) {
        console.error('Failed to update forwarding number:', updateError);
        return NextResponse.json(
          { error: updateError.message || 'Failed to update forwarding number' },
          { status: 500 }
        );
      }

      const response = NextResponse.json({
        success: true,
        message: 'Forwarding number updated successfully'
      });

      // Add CORS headers for Vercel
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');

      return response;
    }

    // For full configuration update
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
      const updateData: any = {
        account_sid: accountSid,
        auth_token: encryptedAuthToken,
        phone_number: phoneNumber,
        phone_number_sid: phoneNumberSid,
        is_active: true,
        is_verified: true,
        verified_at: new Date().toISOString(),
        webhook_base_url: process.env.NEXT_PUBLIC_APP_URL
      };

      // Include forwarding number if provided
      if (forwardingNumber) {
        updateData.forwarding_number = forwardingNumber;
      }

      result = await supabase
        .from('twilio_configurations')
        .update(updateData)
        .eq('id', existingConfig.id);
    } else {
      // Create new configuration
      const insertData: any = {
        tenant_id: profile.tenant_id,
        account_sid: accountSid,
        auth_token: encryptedAuthToken,
        phone_number: phoneNumber,
        phone_number_sid: phoneNumberSid,
        is_active: true,
        is_verified: true,
        verified_at: new Date().toISOString(),
        webhook_base_url: process.env.NEXT_PUBLIC_APP_URL
      };

      // Include forwarding number if provided
      if (forwardingNumber) {
        insertData.forwarding_number = forwardingNumber;
      }

      result = await supabase
        .from('twilio_configurations')
        .insert(insertData);
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