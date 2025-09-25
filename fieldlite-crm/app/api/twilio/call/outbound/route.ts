import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  decrypt,
  isEncrypted,
  reencryptWithEnhancedSecurity,
  getEncryptionMetrics
} from '@/lib/encryption';

/**
 * Enhanced Twilio outbound call route with hierarchical decryption,
 * automatic re-encryption, and comprehensive error handling.
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let decryptionMethod = 'unknown';

  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const body = await request.json();
    const { to, from } = body;

    if (!to) {
      return NextResponse.json(
        { error: 'Recipient phone number is required' },
        { status: 400 }
      );
    }

    // Get Twilio configuration for this tenant
    const { data: twilioConfig } = await supabase
      .from('twilio_configurations')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (!twilioConfig || !twilioConfig.is_active) {
      return NextResponse.json(
        { error: 'Twilio is not configured for this tenant' },
        { status: 400 }
      );
    }

    // Enhanced decryption with multiple strategies
    let authToken: string;
    let requiresReencryption = false;

    try {
      // Primary decryption attempt with enhanced service
      authToken = decrypt(twilioConfig.auth_token, twilioConfig.account_sid);

      // Detect decryption method used
      if (twilioConfig.auth_token.startsWith('v2:')) {
        decryptionMethod = 'pbkdf2';
      } else if (isEncrypted(twilioConfig.auth_token)) {
        decryptionMethod = 'legacy';
        requiresReencryption = true;
      } else {
        decryptionMethod = 'plaintext';
        requiresReencryption = true;
      }

      // Log security concerns
      if (decryptionMethod === 'plaintext' && process.env.NODE_ENV === 'production') {
        console.error(
          '[SECURITY CRITICAL] Plaintext Twilio auth token detected in production!',
          {
            tenantId: profile.tenant_id,
            timestamp: new Date().toISOString(),
            action: 'IMMEDIATE_ENCRYPTION_REQUIRED'
          }
        );
      } else if (decryptionMethod === 'legacy') {
        console.warn(
          '[Migration Notice] Legacy encryption detected for Twilio auth token',
          {
            tenantId: profile.tenant_id,
            timestamp: new Date().toISOString(),
            action: 'SCHEDULE_REENCRYPTION'
          }
        );
      }

      // Self-healing: Attempt to re-encrypt with enhanced security
      if (requiresReencryption && process.env.NODE_ENV !== 'development') {
        try {
          const { newEncrypted, wasLegacy } = await reencryptWithEnhancedSecurity(
            twilioConfig.auth_token,
            twilioConfig.account_sid
          );

          // Update database with new encrypted token
          const { error: updateError } = await supabase
            .from('twilio_configurations')
            .update({
              auth_token: newEncrypted,
              encryption_version: 'v2',
              last_migration: new Date().toISOString()
            })
            .eq('tenant_id', profile.tenant_id);

          if (!updateError) {
            console.info(
              '[Security Enhancement] Successfully re-encrypted Twilio auth token',
              {
                tenantId: profile.tenant_id,
                fromMethod: wasLegacy ? 'legacy' : 'plaintext',
                toMethod: 'pbkdf2',
                timestamp: new Date().toISOString()
              }
            );
          }
        } catch (reencryptError) {
          console.error(
            '[Re-encryption Warning] Failed to upgrade encryption',
            {
              tenantId: profile.tenant_id,
              error: reencryptError instanceof Error ? reencryptError.message : 'Unknown error'
            }
          );
        }
      }

    } catch (decryptError) {
      // Fallback strategies in order of preference
      console.error(
        '[Decryption Failed] Attempting fallback strategies',
        {
          tenantId: profile.tenant_id,
          error: decryptError instanceof Error ? decryptError.message : 'Unknown error'
        }
      );

      // Strategy 1: Try environment variable override
      const envOverride = process.env[`TWILIO_AUTH_TOKEN_${profile.tenant_id}`];
      if (envOverride) {
        authToken = envOverride;
        decryptionMethod = 'env_override';
        console.info(
          '[Fallback Success] Using environment variable override',
          { tenantId: profile.tenant_id }
        );
      }
      // Strategy 2: If in development, try raw value (with warning)
      else if (process.env.NODE_ENV === 'development') {
        authToken = twilioConfig.auth_token;
        decryptionMethod = 'development_raw';
        console.warn(
          '[Development Mode] Using raw auth token - NOT SECURE',
          { tenantId: profile.tenant_id }
        );
      }
      // Strategy 3: Fail securely in production
      else {
        console.error(
          '[Security Block] Cannot proceed with unencrypted token in production',
          { tenantId: profile.tenant_id }
        );

        return NextResponse.json(
          {
            error: 'Twilio authentication configuration error',
            details: 'Auth token decryption failed. Please reconfigure Twilio settings.',
            action: 'RE_SAVE_TWILIO_CONFIGURATION'
          },
          { status: 500 }
        );
      }
    }

    // Use the tenant's Twilio phone number as the caller ID
    const fromNumber = from || twilioConfig.phone_number;
    const toNumber = to;

    // Determine the base URL for webhooks
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    // Create webhook URLs
    const statusCallback = `${baseUrl}/api/twilio/webhook/${profile.tenant_id}/status`;

    // For outbound calls, we need a simple TwiML URL that just connects the call
    // Using Twimlets echo for a simple connection
    const twimlUrl = `https://twimlets.com/echo?Twiml=%3CResponse%3E%3C%2FResponse%3E`;

    // Make the call using Twilio API with enhanced error handling
    const authString = Buffer.from(`${twilioConfig.account_sid}:${authToken}`).toString('base64');

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioConfig.account_sid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          'To': toNumber,
          'From': fromNumber,
          'Url': twimlUrl,  // Simple empty TwiML response
          'StatusCallback': statusCallback,
          'StatusCallbackMethod': 'POST',
          'StatusCallbackEvent': 'initiated,ringing,answered,completed',
          'Record': 'false',
          'Timeout': '60'
        }).toString()
      }
    );

    // Enhanced error handling with detailed diagnostics
    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.json();

      // Check for authentication errors specifically
      if (twilioResponse.status === 401) {
        console.error(
          '[Twilio Auth Failed] Invalid credentials',
          {
            tenantId: profile.tenant_id,
            accountSid: twilioConfig.account_sid,
            decryptionMethod,
            errorCode: errorData.code,
            errorMessage: errorData.message
          }
        );

        return NextResponse.json(
          {
            error: 'Twilio authentication failed',
            details: 'Invalid account SID or auth token. Please verify your Twilio credentials.',
            action: 'UPDATE_TWILIO_CREDENTIALS',
            twilioError: {
              code: errorData.code,
              message: errorData.message
            }
          },
          { status: 401 }
        );
      }

      // Other Twilio errors
      console.error(
        '[Twilio API Error]',
        {
          tenantId: profile.tenant_id,
          status: twilioResponse.status,
          error: errorData
        }
      );

      return NextResponse.json(
        {
          error: errorData.message || 'Failed to initiate call',
          details: errorData,
          twilioErrorCode: errorData.code
        },
        { status: twilioResponse.status || 500 }
      );
    }

    const callData = await twilioResponse.json();

    // Log the outbound call in database with enhanced metadata
    await supabase.from('calls').insert({
      tenant_id: profile.tenant_id,
      twilio_call_sid: callData.sid,
      from_number: fromNumber,
      to_number: toNumber,
      direction: 'outbound',
      status: 'initiated',
      initiated_by: user.id,
      encryption_method: decryptionMethod,
      api_version: callData.api_version
    });

    // Calculate and log performance metrics
    const processingTime = Date.now() - startTime;

    // Get current encryption metrics for monitoring
    const metrics = getEncryptionMetrics();

    return NextResponse.json({
      success: true,
      message: 'Call initiated successfully',
      callSid: callData.sid,
      to: callData.to,
      from: callData.from,
      status: callData.status,
      performance: {
        processingTimeMs: processingTime,
        decryptionMethod,
        encryptionHealth: {
          securityScore: metrics.securityScore,
          successRate: metrics.successRate
        }
      }
    });

  } catch (error: any) {
    // Log comprehensive error details
    console.error(
      '[Outbound Call Critical Error]',
      {
        error: error.message || 'Unknown error',
        stack: error.stack,
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime
      }
    );

    // Get encryption metrics for diagnostics
    const metrics = getEncryptionMetrics();

    return NextResponse.json(
      {
        error: 'Failed to initiate call',
        details: error.message,
        diagnostics: {
          recommendations: metrics.recommendations,
          securityScore: metrics.securityScore
        }
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check Twilio configuration status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    // Get Twilio configuration status
    const { data: twilioConfig } = await supabase
      .from('twilio_configurations')
      .select('is_active, account_sid, phone_number, encryption_version')
      .eq('tenant_id', profile.tenant_id)
      .single();

    // Get encryption metrics
    const metrics = getEncryptionMetrics();

    return NextResponse.json({
      configured: !!twilioConfig,
      active: twilioConfig?.is_active || false,
      encryptionVersion: twilioConfig?.encryption_version || 'unknown',
      health: {
        securityScore: metrics.securityScore,
        successRate: metrics.successRate,
        recommendations: metrics.recommendations
      }
    });

  } catch (error: any) {
    console.error('[Configuration Check Error]', error);
    return NextResponse.json(
      { error: 'Failed to check configuration' },
      { status: 500 }
    );
  }
}