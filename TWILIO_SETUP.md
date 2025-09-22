# Twilio Call Tracking Setup

## Overview
Your CRM now has complete call tracking functionality! All calls made through the system will be automatically saved to the database with the following information:
- Call duration
- Call status (queued, ringing, answered, completed, failed, etc.)
- Recording URL (if recording is enabled)
- Associated contact, deal, or job

## What's Been Implemented

### 1. **Webhook Endpoints**
- `/api/twilio/voice/answer` - Handles call initialization and TwiML responses
- `/api/twilio/voice/status` - Receives call status updates
- `/api/twilio/voice/recording` - Receives recording URLs when calls are recorded

### 2. **Database Integration**
- Calls are automatically saved to the `calls` table
- Call events are tracked in the `call_events` table
- All calls are linked to your tenant for multi-tenant isolation

### 3. **Call Recording**
- Calls are recorded by default (can be disabled)
- Recordings are automatically linked to call records
- Recording URLs are stored for playback

## Setup Instructions

### For Local Development (Testing)
Since webhooks require a public URL, you'll need to use a tunneling service for local development:

1. **Install ngrok** (recommended):
   ```bash
   npm install -g ngrok
   ```

2. **Start your tunnel**:
   ```bash
   ngrok http 3003
   ```

3. **Update your .env.local**:
   ```
   NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io
   ```

4. **Restart your development server**

### For Production

1. **Deploy your application** to a public URL (Vercel, Netlify, etc.)

2. **Update environment variables**:
   ```
   NEXT_PUBLIC_APP_URL=https://your-production-url.com
   ```

3. **Configure Twilio Webhooks** (Optional - for inbound calls):
   - Go to your Twilio Console
   - Navigate to Phone Numbers > Manage > Active Numbers
   - Click on your phone number
   - In the "Voice & Fax" section, set:
     - **When a call comes in**: Webhook - `https://your-url.com/api/twilio/voice/answer`
     - **Method**: HTTP POST
     - **Call status callback URL**: `https://your-url.com/api/twilio/voice/status`

## How It Works

### Outbound Calls
1. User clicks "Call" button in the CRM
2. CRM creates a call record in the database
3. Twilio initiates the call with webhook URLs configured
4. As the call progresses, status updates are sent to your webhooks
5. Call record is updated with duration, recording URL, etc.

### Inbound Calls (if configured)
1. Customer calls your Twilio number
2. Twilio sends request to your answer webhook
3. Your app creates a call record
4. Call is routed based on your configuration
5. Status updates and recordings are tracked automatically

## Testing

1. **Make a test call** from the Contacts page
2. **Check the database**:
   - Look in the `calls` table for your call record
   - Check `call_events` for status updates
3. **View the recording** (if enabled):
   - Recording URL will be saved after the call completes

## Troubleshooting

### Calls not being saved?
- Check that your webhook URLs are publicly accessible
- Verify your Twilio credentials are correct
- Look at server logs for any errors

### Recordings not appearing?
- Recordings are only available after the call completes
- Check that recording is enabled when making the call
- Verify the recording webhook URL is accessible

### 406 Errors?
- Ensure all database migrations have been run
- Check that RLS policies are properly configured
- Verify the user has a profile with a tenant_id

## Security Notes

- All webhook endpoints validate that requests are from Twilio (when auth token is available)
- Call records are isolated by tenant using RLS
- Twilio auth tokens are encrypted in the database
- Recording URLs are private and require authentication to access

## Next Steps

- Set up inbound call routing
- Configure voicemail handling
- Add SMS tracking
- Implement call analytics dashboard