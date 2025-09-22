# 🚀 Cloudflare Tunnel Setup for Twilio Webhooks

## Why Cloudflare Tunnel?
- **FREE** - No cost for personal use
- **Permanent URL** - Same URL every time (unlike ngrok)
- **No signup limits** - Unlimited usage
- **More reliable** - Better uptime than free ngrok
- **Built-in security** - DDoS protection included

## Quick Setup (Windows)

### Step 1: Download Cloudflared

1. Download the Windows executable:
   ```
   https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
   ```

2. Rename it to `cloudflared.exe` and place it in a folder (e.g., `C:\cloudflared\`)

3. Add to PATH (optional) or use full path

### Step 2: Start Cloudflare Tunnel

Run this command in PowerShell or Command Prompt:

```bash
# Quick tunnel (no account needed)
cloudflared tunnel --url http://localhost:3003

# Or if not in PATH:
C:\cloudflared\cloudflared.exe tunnel --url http://localhost:3003
```

You'll see output like:
```
2024-01-09T10:30:45Z INF +------------------------------------------------------------+
2024-01-09T10:30:45Z INF |  Your quick tunnel has been created! Visit it at:        |
2024-01-09T10:30:45Z INF |  https://sample-word-here.trycloudflare.com              |
2024-01-09T10:30:45Z INF +------------------------------------------------------------+
```

### Step 3: Copy Your URL

Your tunnel URL will be something like:
```
https://sample-word-here.trycloudflare.com
```

**Note:** This URL changes each time you restart. For a permanent URL, see "Permanent URL Setup" below.

## Configure Twilio with Cloudflare URL

### In Twilio Console for (833) 949-0539:

1. **Voice Configuration:**
   - A call comes in: `https://your-tunnel.trycloudflare.com/api/twilio/voice/answer`
   - HTTP POST

2. **Call Status Callback:**
   - URL: `https://your-tunnel.trycloudflare.com/api/twilio/voice/status`
   - HTTP POST

3. Click **"Save configuration"**

## Update Your .env.local

```bash
# Update with your Cloudflare tunnel URL
NEXT_PUBLIC_APP_URL=https://your-tunnel.trycloudflare.com

# Your phone for forwarding
FORWARD_PHONE_NUMBER=+1234567890
```

## Permanent URL Setup (Optional)

For a permanent URL, you need a free Cloudflare account:

### 1. Create Free Cloudflare Account
- Sign up at: https://dash.cloudflare.com/sign-up
- No credit card required

### 2. Authenticate Cloudflared
```bash
cloudflared tunnel login
```
This opens a browser to authenticate.

### 3. Create Named Tunnel
```bash
# Create a tunnel with a name
cloudflared tunnel create crm-tunnel

# You'll get a Tunnel ID like:
# Created tunnel crm-tunnel with id 6ff42ae2-765d-4adf-8112-31c55c1551ef
```

### 4. Create Config File
Create `~/.cloudflared/config.yml`:
```yaml
tunnel: YOUR-TUNNEL-ID
credentials-file: C:\Users\YOUR-USERNAME\.cloudflared\YOUR-TUNNEL-ID.json

ingress:
  - hostname: crm.yourdomain.com  # Or use a cloudflare subdomain
    service: http://localhost:3003
  - service: http_status:404
```

### 5. Add DNS Route (if using your domain)
```bash
cloudflared tunnel route dns crm-tunnel crm.yourdomain.com
```

### 6. Run Named Tunnel
```bash
cloudflared tunnel run crm-tunnel
```

Now you have a permanent URL!

## Run Cloudflare Tunnel as a Service (Windows)

To keep it running in the background:

```bash
# Install as Windows service
cloudflared service install

# Start the service
cloudflared service start
```

## Quick Commands Reference

```bash
# Start quick tunnel (temporary URL)
cloudflared tunnel --url http://localhost:3003

# Check tunnel status
cloudflared tunnel list

# Stop tunnel
Ctrl+C

# View tunnel info
cloudflared tunnel info YOUR-TUNNEL-NAME
```

## Comparison: Cloudflare vs ngrok vs Localtunnel

| Feature | Cloudflare Tunnel | ngrok (Free) | Localtunnel |
|---------|------------------|--------------|-------------|
| **Cost** | FREE | FREE (limited) | FREE |
| **Permanent URL** | ✅ (with account) | ❌ | ❌ |
| **No signup** | ✅ (quick tunnel) | ❌ | ✅ |
| **Connection limit** | Unlimited | 40 connections/min | Unlimited |
| **Timeout** | None | 2 hours | None |
| **Custom domain** | ✅ | ❌ (paid) | ❌ |
| **Reliability** | Excellent | Good | Fair |
| **DDoS Protection** | ✅ | Limited | ❌ |

## Troubleshooting

### "Connection refused" error
- Make sure your app is running on port 3003
- Check: `npm run dev` is running

### URL not working
- Verify tunnel is running (check terminal)
- Ensure URL is copied correctly
- Check firewall settings

### Twilio webhooks failing
- Verify webhook URLs end with correct paths
- Check Cloudflare tunnel is running
- Look at tunnel logs for errors

## Testing Your Setup

1. **Start everything:**
```bash
# Terminal 1: Start your app
cd fieldlite-crm
npm run dev

# Terminal 2: Start Cloudflare tunnel
cloudflared tunnel --url http://localhost:3003
```

2. **Update Twilio webhooks** with your Cloudflare URL

3. **Test a call:**
   - Call (833) 949-0539
   - Your phone should ring
   - Check database for call record

## Pro Tips

1. **Save your tunnel URL** - Quick tunnels change each restart
2. **Use named tunnels** for production - Permanent URLs
3. **Check tunnel dashboard** at https://dash.teams.cloudflare.com
4. **Monitor usage** - Free tier is very generous
5. **Use config file** for complex setups

---

## Why Cloudflare Tunnel is Better for Twilio

✅ **No timeouts** - Runs indefinitely
✅ **Better reliability** - Enterprise-grade infrastructure
✅ **Free forever** - No paid plans needed for basic use
✅ **Global network** - Fast response times
✅ **Security built-in** - Automatic HTTPS, DDoS protection
✅ **No rate limits** - Handle unlimited webhooks

Ready to use Cloudflare Tunnel! 🚀