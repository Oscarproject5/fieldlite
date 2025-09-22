# 🚀 ngrok Setup for Twilio Testing

## Quick Setup Steps

### 1. Sign up for ngrok (Free)
Go to: https://ngrok.com/signup

### 2. Get your auth token
After signing up, you'll see your auth token at:
https://dashboard.ngrok.com/auth

### 3. Authenticate ngrok
Run this command with your token:
```bash
ngrok authtoken YOUR_AUTH_TOKEN_HERE
```

### 4. Start ngrok tunnel
```bash
ngrok http 3003
```

You'll see output like:
```
Session Status                online
Account                       your-email@example.com (Plan: Free)
Version                       3.5.0
Region                        United States (us)
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:3003
```

### 5. Copy your ngrok URL
Look for the line that says "Forwarding" and copy the HTTPS URL:
`https://abc123def456.ngrok-free.app`

## 📱 Configure Twilio

In your Twilio Console for phone number (833) 949-0539:

### Voice Configuration:
**A call comes in:**
- Webhook: `https://abc123def456.ngrok-free.app/api/twilio/voice/answer`
- HTTP POST

**Call status changes:**
- URL: `https://abc123def456.ngrok-free.app/api/twilio/voice/status`
- HTTP POST

### Click "Save configuration"

## 🔧 Update Your .env.local

```bash
NEXT_PUBLIC_APP_URL=https://abc123def456.ngrok-free.app
```

## 🔄 Restart Your Dev Server

```bash
# Stop the server (Ctrl+C)
# Start it again
cd fieldlite-crm
npm run dev
```

## ✅ Test Your Setup

1. **Make an outbound call:**
   - Go to http://localhost:3003/contacts
   - Click the phone icon next to any contact
   - Call should initiate

2. **Test inbound call:**
   - Call (833) 949-0539 from any phone
   - Call should be received and logged

3. **Check database:**
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM calls ORDER BY created_at DESC LIMIT 5;
   ```

## 🔍 Troubleshooting

### ngrok URL changes
- Free ngrok gives you a new URL each time you restart
- Update Twilio webhooks when URL changes
- Update .env.local with new URL

### "Tunnel not found" error
- Make sure ngrok is running: `ngrok http 3003`
- Check the port matches your app (3003)

### Calls not logging
- Verify webhooks are configured in Twilio
- Check ngrok is running
- Ensure .env.local has correct URL

## 📝 Important Notes

- **ngrok URL expires** after 8 hours on free plan
- **New URL each session** - update Twilio webhooks
- **Keep ngrok running** while testing
- **Alternative**: Use Cloudflare Tunnel (free, permanent URL)

## 🎯 Quick Commands Reference

```bash
# Start everything for testing
cd fieldlite-crm
npm run dev                    # Terminal 1: Start app
ngrok http 3003               # Terminal 2: Start tunnel

# View ngrok web interface
# Open: http://localhost:4040
# See all requests/responses
```

## 💡 Pro Tips

1. **Save your ngrok URL** in a note while testing
2. **Use ngrok web interface** (http://localhost:4040) to debug webhooks
3. **Test with your phone** for realistic testing
4. **Check call logs** in Twilio Console under Monitor > Logs

---

Ready to test? Follow steps 1-5 above and your Twilio calls will work locally! 🚀