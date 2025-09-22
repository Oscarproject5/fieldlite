import twilio from 'twilio';
import { encrypt, decrypt } from '../encryption';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface TwilioConfig {
  id: string;
  tenant_id: string;
  account_sid: string;
  auth_token: string;
  phone_number: string;
  phone_number_sid?: string;
  webhook_base_url?: string;
  is_active: boolean;
  is_verified: boolean;
}

export interface CallData {
  from: string;
  to: string;
  url?: string;
  statusCallback?: string;
  statusCallbackEvent?: string[];
  statusCallbackMethod?: string;
  record?: boolean;
  recordingStatusCallback?: string;
  recordingStatusCallbackMethod?: string;
  machineDetection?: string;
}

export class TwilioService {
  private client: twilio.Twilio | null = null;
  private config: TwilioConfig | null = null;

  constructor(private tenantId: string) {}

  async initialize(): Promise<boolean> {
    try {
      // Fetch Twilio configuration for the tenant
      const { data, error } = await supabase
        .from('twilio_configurations')
        .select('*')
        .eq('tenant_id', this.tenantId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully

      if (error) {
        console.error('Error fetching Twilio configuration:', error);
        return false;
      }

      if (!data) {
        console.log('No Twilio configuration found for tenant:', this.tenantId);
        return false;
      }

      // Check if configuration is active
      if (!data.is_active) {
        console.log('Twilio configuration exists but is not active for tenant:', this.tenantId);
        // Still allow initialization for testing purposes
      }

      // Decrypt the auth token
      const decryptedAuthToken = decrypt(data.auth_token);

      this.config = {
        ...data,
        auth_token: decryptedAuthToken
      };

      // Validate that we have required fields
      if (!this.config.account_sid || !this.config.auth_token || !this.config.phone_number) {
        console.error('Twilio configuration is incomplete:', {
          hasAccountSid: !!this.config.account_sid,
          hasAuthToken: !!this.config.auth_token,
          hasPhoneNumber: !!this.config.phone_number
        });
        return false;
      }

      // Initialize Twilio client
      try {
        this.client = twilio(this.config.account_sid, this.config.auth_token);
        console.log('Twilio client initialized successfully for tenant:', this.tenantId);
        return true;
      } catch (error) {
        console.error('Failed to initialize Twilio client:', error);
        return false;
      }
    } catch (error) {
      console.error('Failed to initialize Twilio service:', error);
      return false;
    }
  }

  getClient(): twilio.Twilio | null {
    return this.client;
  }

  getConfig(): TwilioConfig | null {
    return this.config;
  }

  // Alias for getConfig to match API usage
  async getConfiguration(): Promise<TwilioConfig | null> {
    if (!this.config) {
      await this.initialize();
    }
    return this.config;
  }

  async makeCall(params: {
    to: string;
    twimlContent?: string;
    userId: string;
    contactId?: string | null;
  }): Promise<{ success: boolean; call?: any; error?: string }> {
    if (!this.client || !this.config) {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, error: 'Failed to initialize Twilio service' };
      }
    }

    try {
      // Create TwiML application if twimlContent is provided
      let url = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/answer`;

      if (params.twimlContent) {
        // For test calls with custom TwiML, we'll use TwiML bins or echo the content
        // In production, you'd want to create a proper TwiML application
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say({ voice: 'alice' }, 'This is a test call from FieldLite CRM. Press any key to end this call.');
        twiml.pause({ length: 2 });
        twiml.say({ voice: 'alice' }, 'Thank you for testing. Goodbye!');

        // Use echo TwiML for testing
        url = `http://twimlets.com/echo?Twiml=${encodeURIComponent(params.twimlContent || twiml.toString())}`;
      }

      const call = await this.client!.calls.create({
        from: this.config!.phone_number,
        to: params.to,
        url: url,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/status`,
        statusCallbackMethod: 'POST',
        record: false
      });

      // Log the call
      await this.logCall({
        twilio_call_sid: call.sid,
        from_number: call.from,
        to_number: call.to,
        direction: 'outbound',
        status: call.status,
        user_id: params.userId,
        contact_id: params.contactId
      });

      return { success: true, call };
    } catch (error: any) {
      console.error('Failed to make call:', error);
      return { success: false, error: error.message || 'Failed to make call' };
    }
  }

  async sendSMS(params: {
    to: string;
    body: string;
    contactId?: string | null;
  }): Promise<{ success: boolean; message?: any; error?: string }> {
    if (!this.client || !this.config) {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, error: 'Failed to initialize Twilio service' };
      }
    }

    try {
      const message = await this.client!.messages.create({
        from: this.config!.phone_number,
        to: params.to,
        body: params.body,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/sms/status`
      });

      return { success: true, message };
    } catch (error: any) {
      console.error('Failed to send SMS:', error);
      return { success: false, error: error.message || 'Failed to send SMS' };
    }
  }

  async validateCredentials(accountSid: string, authToken: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const testClient = twilio(accountSid, authToken);

      // Try to fetch account details to validate credentials
      const account = await testClient.api.accounts(accountSid).fetch();

      if (account.sid === accountSid) {
        return { valid: true };
      }

      return { valid: false, error: 'Account validation failed' };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Invalid credentials'
      };
    }
  }

  async getAvailablePhoneNumbers(accountSid: string, authToken: string): Promise<string[]> {
    try {
      const testClient = twilio(accountSid, authToken);
      const phoneNumbers = await testClient.incomingPhoneNumbers.list();

      return phoneNumbers.map(p => ({
        phoneNumber: p.phoneNumber,
        sid: p.sid,
        friendlyName: p.friendlyName,
        capabilities: p.capabilities
      })) as any;
    } catch (error) {
      console.error('Failed to fetch phone numbers:', error);
      return [];
    }
  }


  async logCall(callData: any): Promise<void> {
    try {
      await supabase.from('calls').insert({
        tenant_id: this.tenantId,
        ...callData
      });
    } catch (error) {
      console.error('Failed to log call:', error);
    }
  }

  async updateCallStatus(callSid: string, status: string, additionalData?: any): Promise<void> {
    try {
      await supabase
        .from('calls')
        .update({
          status,
          ...additionalData,
          updated_at: new Date().toISOString()
        })
        .eq('twilio_call_sid', callSid)
        .eq('tenant_id', this.tenantId);
    } catch (error) {
      console.error('Failed to update call status:', error);
    }
  }

  async configureWebhooks(phoneNumberSid: string): Promise<boolean> {
    if (!this.client || !this.config) {
      throw new Error('Twilio service not initialized');
    }

    try {
      const webhookBase = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/webhook/${this.tenantId}`;

      await this.client.incomingPhoneNumbers(phoneNumberSid).update({
        voiceUrl: `${webhookBase}/voice`,
        voiceMethod: 'POST',
        statusCallback: `${webhookBase}/status`,
        statusCallbackMethod: 'POST',
        smsUrl: `${webhookBase}/sms`,
        smsMethod: 'POST'
      });

      return true;
    } catch (error) {
      console.error('Failed to configure webhooks:', error);
      return false;
    }
  }
}