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
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.log('No active Twilio configuration found for tenant:', this.tenantId);
        return false;
      }

      // Decrypt the auth token
      const decryptedAuthToken = decrypt(data.auth_token);

      this.config = {
        ...data,
        auth_token: decryptedAuthToken
      };

      // Initialize Twilio client
      this.client = twilio(this.config.account_sid, this.config.auth_token);

      return true;
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

  async makeCall(callData: CallData): Promise<any> {
    if (!this.client || !this.config) {
      throw new Error('Twilio service not initialized');
    }

    try {
      const callParams: any = {
        from: callData.from || this.config.phone_number,
        to: callData.to,
        url: callData.url || `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/answer`,
        statusCallback: callData.statusCallback,
        statusCallbackMethod: callData.statusCallbackMethod || 'POST',
        record: callData.record || false
      };

      // Add optional parameters if provided
      if (callData.statusCallbackEvent) {
        callParams.statusCallbackEvent = callData.statusCallbackEvent;
      }
      if (callData.recordingStatusCallback) {
        callParams.recordingStatusCallback = callData.recordingStatusCallback;
        callParams.recordingStatusCallbackMethod = callData.recordingStatusCallbackMethod || 'POST';
      }
      if (callData.machineDetection) {
        callParams.machineDetection = callData.machineDetection;
      }

      const call = await this.client.calls.create(callParams);

      return call;
    } catch (error) {
      console.error('Failed to make call:', error);
      throw error;
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