# 📞 Complete Twilio Integration Guide

## Table of Contents
1. [How Twilio Works](#how-twilio-works)
2. [Architecture Overview](#architecture-overview)
3. [Call Flow Diagrams](#call-flow-diagrams)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Configuration](#configuration)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## How Twilio Works

### What is Twilio?
Twilio is a cloud communications platform that allows you to:
- Make and receive phone calls via API
- Send and receive SMS messages
- Record calls and store recordings
- Build IVR (Interactive Voice Response) systems
- Handle call routing and queuing

### Your Setup
- **Twilio Number:** (833) 949-0539 (+18777804236)
- **Forward To:** Your personal phone (configured in FORWARD_PHONE_NUMBER)
- **All calls are:** Recorded and saved to database
- **Caller ID:** Shows original caller's number on your phone

### Key Concepts

#### 1. **Phone Numbers**
- You purchase phone numbers from Twilio
- These numbers can receive calls and SMS
- Each number can be configured with webhooks

#### 2. **Webhooks**
- HTTP callbacks that Twilio sends to your application
- Notify you of events (call started, ended, recording ready)
- Your app responds with TwiML instructions

#### 3. **TwiML (Twilio Markup Language)**
- XML-based language that tells Twilio what to do
- Examples: `<Say>`, `<Dial>`, `<Record>`, `<Gather>`

#### 4. **Call SID**
- Unique identifier for each call
- Format: `CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Used to track and update call records

---

## Architecture Overview

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Customer  │──Call──▶│   Twilio    │──POST──▶│  Your CRM   │
│    Phone    │         │   Service   │ Webhook │  Application│
└─────────────┘         └─────────────┘         └─────────────┘
                               │                        │
                               │                        ▼
                               │                 ┌─────────────┐
                               └────Recording───▶│  Database   │
                                                 │   (Calls)   │
                                                 └─────────────┘
```

### Components in Your CRM

1. **Twilio Service** (`/lib/twilio/service.ts`)
   - Initializes Twilio client
   - Makes outbound calls
   - Manages credentials

2. **Webhook Endpoints** (`/api/twilio/voice/`)
   - `/answer` - Handles incoming calls
   - `/status` - Receives call status updates
   - `/recording` - Gets recording URLs

3. **Database Tables**
   - `twilio_configurations` - Stores account credentials
   - `calls` - Stores call records
   - `call_events` - Logs all call events

---

## Call Flow Diagrams

### Outbound Call Flow
```
User clicks "Call" button in CRM
            │
            ▼
CRM creates call record in database
            │
            ▼
CRM calls Twilio API with:
- To: Customer number
- From: Your Twilio number
- Webhooks: Status & recording URLs
            │
            ▼
Twilio initiates call
            │
            ├──▶ Status: "queued" ──▶ Webhook ──▶ Update DB
            ├──▶ Status: "ringing" ──▶ Webhook ──▶ Update DB
            ├──▶ Status: "in-progress" ──▶ Webhook ──▶ Update DB
            └──▶ Status: "completed" ──▶ Webhook ──▶ Update DB + Duration
                        │
                        └──▶ Recording ready ──▶ Webhook ──▶ Save URL
```

### Inbound Call Flow (Forwarding to Your Phone)
```
Customer dials your Twilio number (833) 949-0539
            │
            ▼
Twilio sends POST to /api/twilio/voice/answer
            │
            ▼
CRM creates call record (direction: inbound)
            │
            ▼
CRM responds with TwiML:
<Response>
  <Say>Thank you for calling. Connecting you now.</Say>
  <Dial record="true">
    <Number>+1YourPhoneNumber</Number>  <!-- Forwards to your phone -->
  </Dial>
</Response>
            │
            ▼
YOUR PHONE RINGS with original caller's number
            │
            ▼
You answer on your phone
            │
            ▼
Call is recorded and tracked in database
            │
            └──▶ Status updates: answered → completed
```

---

## Database Schema

### `calls` Table
```sql
- id: UUID (Primary Key)
- tenant_id: UUID (Links to tenant)
- twilio_call_sid: String (Twilio's unique ID)
- from_number: String
- to_number: String
- direction: Enum ('inbound', 'outbound')
- status: Enum ('queued', 'ringing', 'in-progress', 'completed', 'failed', etc.)
- duration_seconds: Integer
- recording_url: String
- price: Decimal
- contact_id: UUID (Optional - links to contact)
- user_id: UUID (Who made the call)
- created_at: Timestamp
- answered_at: Timestamp
- ended_at: Timestamp
```

### `call_events` Table
```sql
- id: UUID
- call_id: UUID (Links to calls table)
- event_type: String (status change type)
- event_data: JSONB (Full webhook data)
- created_at: Timestamp
```

---

## API Endpoints

### 1. **POST /api/calls/initiate**
Starts an outbound call.

**Request:**
```json
{
  "to": "+1234567890",
  "contactId": "uuid",  // Optional
  "record": true        // Optional, defaults to true
}
```

**Response:**
```json
{
  "success": true,
  "callSid": "CAxxxxxxxxxxxxxxxxxx",
  "status": "queued"
}
```

### 2. **POST /api/twilio/voice/answer**
Webhook called when call starts. Returns TwiML instructions.

**Twilio sends:**
```
CallSid=CAxxxx
From=+1234567890
To=+0987654321
Direction=inbound
CallStatus=ringing
```

**Your response (TwiML):**
```xml
<Response>
  <Say>Connecting your call...</Say>
  <Dial record="record-from-ringing-dual">
    <Number>+1234567890</Number>
  </Dial>
</Response>
```

### 3. **POST /api/twilio/voice/status**
Receives call status updates.

**Twilio sends:**
```
CallSid=CAxxxx
CallStatus=completed
CallDuration=145
Direction=outbound-api
```

### 4. **POST /api/twilio/voice/recording**
Receives recording information when ready.

**Twilio sends:**
```
CallSid=CAxxxx
RecordingSid=RExxxx
RecordingUrl=https://api.twilio.com/recording.mp3
RecordingDuration=145
```

---

## Configuration

### Environment Variables (.env.local)
```bash
# Your Twilio Account (from console.twilio.com)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX  # Your Twilio phone number

# Forward inbound calls to your personal phone
FORWARD_PHONE_NUMBER=+1234567890  # Replace with YOUR phone number

# Your app URL (for webhooks)
NEXT_PUBLIC_APP_URL=https://your-app.com  # Production
# OR for local testing:
NEXT_PUBLIC_APP_URL=https://your-tunnel.loca.lt  # Localtunnel
NEXT_PUBLIC_APP_URL=https://xxx.ngrok.io         # ngrok

# Encryption for storing auth tokens
ENCRYPTION_KEY=32_character_random_string_here
```

### Twilio Console Configuration

1. **For Inbound Calls:**
   - Go to: Phone Numbers → Manage → Active Numbers
   - Click your number
   - Set Voice webhook: `https://your-app.com/api/twilio/voice/answer`
   - Set Status callback: `https://your-app.com/api/twilio/voice/status`

2. **For Call Recording:**
   - Automatically configured via API
   - Recordings stored on Twilio's servers
   - URLs saved in your database

---

## Testing

### Local Development with Tunnel (Two Options)

#### Option 1: Localtunnel (No signup required)
```bash
# Install
npm install -g localtunnel

# Start tunnel
lt --port 3003

# You'll get a URL like: https://short-shrimps-build.loca.lt
```

#### Option 2: ngrok (Requires free account)
```bash
# Install
npm install -g ngrok

# Authenticate (get token from ngrok.com/signup)
ngrok authtoken YOUR_TOKEN

# Start tunnel
ngrok http 3003

# You'll get a URL like: https://abc123.ngrok.io
```

3. **Update .env.local:**
```bash
NEXT_PUBLIC_APP_URL=https://your-tunnel-url.loca.lt
FORWARD_PHONE_NUMBER=+1234567890  # Your personal phone
```

4. **Configure Twilio webhooks** in Console to use your tunnel URL

### Test Scenarios

#### Test Outbound Call:
1. Go to Contacts page
2. Click phone icon next to a contact
3. Verify in database:
   - Call record created in `calls` table
   - Status updates from queued → completed
   - Recording URL saved

#### Test Inbound Call (Forwarding):
1. Configure webhooks in Twilio
2. Call (833) 949-0539 from any phone
3. Your personal phone will ring
4. Answer on your phone
5. Verify in database:
   - Call appears with `direction: 'inbound'`
   - Shows original caller's number
   - Recording URL saved after call ends
   - Duration tracked

### Database Queries for Testing

```sql
-- View recent calls
SELECT * FROM calls
ORDER BY created_at DESC
LIMIT 10;

-- View call with events
SELECT c.*, ce.event_type, ce.created_at as event_time
FROM calls c
LEFT JOIN call_events ce ON c.id = ce.call_id
WHERE c.twilio_call_sid = 'CAxxxx'
ORDER BY ce.created_at;

-- Check recording URLs
SELECT from_number, to_number, duration_seconds, recording_url
FROM calls
WHERE recording_url IS NOT NULL;
```

---

## Troubleshooting

### Common Issues

#### 1. "Twilio service not initialized"
- **Cause:** No Twilio configuration for tenant
- **Fix:** Configure Twilio in Settings → Twilio

#### 2. Calls not saving to database
- **Cause:** Webhook URLs not accessible
- **Fix:** Use ngrok for local testing, ensure production URL is public

#### 3. 406 Not Acceptable errors
- **Cause:** RLS policies blocking access
- **Fix:** Check user has profile with tenant_id

#### 4. Recording URLs not appearing
- **Cause:** Recording webhook not called
- **Fix:** Wait for call to complete, check webhook URL is correct

#### 5. Inbound calls not tracked
- **Cause:** Webhooks not configured in Twilio Console
- **Fix:** Set webhook URLs in Twilio phone number settings

### Debug Checklist

- [ ] Twilio credentials are correct in .env.local
- [ ] NEXT_PUBLIC_APP_URL is publicly accessible
- [ ] Database migrations have been run
- [ ] User has profile with tenant_id
- [ ] Webhooks configured in Twilio Console (for inbound)
- [ ] ngrok running for local testing

### Viewing Logs

```bash
# Check server logs
npm run dev

# Check Twilio Console
# console.twilio.com → Monitor → Logs → Calls

# Check database
SELECT * FROM call_events
WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

## Security Considerations

1. **Credential Storage**
   - Auth tokens are encrypted before storing in database
   - Never commit credentials to git
   - Use environment variables

2. **Webhook Validation**
   - Validates requests are from Twilio (when possible)
   - Uses signature validation

3. **Multi-tenant Isolation**
   - RLS policies ensure tenants only see their calls
   - Each tenant has separate Twilio configuration

4. **Recording Privacy**
   - Consider legal requirements for call recording
   - Notify callers about recording
   - Secure storage and access control

---

## Next Steps

### Current Features

✅ **What's Working Now:**
- Outbound calls from CRM
- Inbound calls forward to your phone
- All calls recorded automatically
- Call duration tracking
- Database storage of all calls
- Multi-tenant support

### Potential Enhancements

1. **Advanced Call Routing**
   - IVR menus ("Press 1 for sales...")
   - Business hours routing
   - Skills-based routing
   - Multiple agent support

2. **Voicemail System**
   - After-hours voicemail
   - Transcription services
   - Email notifications

3. **SMS Integration**
   - Send/receive SMS
   - SMS templates
   - Automated responses

4. **Analytics Dashboard**
   - Call volume metrics
   - Average call duration
   - Peak calling times
   - Agent performance

5. **Click-to-Call Widget**
   - Embeddable widget for website
   - Call tracking for marketing

---

## Resources

- [Twilio Console](https://console.twilio.com)
- [TwiML Documentation](https://www.twilio.com/docs/voice/twiml)
- [Twilio Node.js SDK](https://www.twilio.com/docs/libraries/node)
- [ngrok Documentation](https://ngrok.com/docs)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)