-- Seed Messages Script (Complete Version)
-- This script ensures the enum is correct and then inserts mock messages

-- First, ensure the message_channel enum has all required values
-- Check if 'internal' exists in the enum, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'internal'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'message_channel')
    ) THEN
        ALTER TYPE message_channel ADD VALUE IF NOT EXISTS 'internal';
    END IF;
END $$;

-- Insert SMS outbound messages
INSERT INTO messages (tenant_id, direction, channel, from_address, to_address, body, related_type, related_id, sent_at, delivered_at, created_at)
SELECT
  c.tenant_id,
  'outbound',
  'sms'::message_channel,
  '+15555551234',
  c.phone,
  CASE (ROW_NUMBER() OVER (ORDER BY c.id))
    WHEN 1 THEN 'Hi ' || COALESCE(c.first_name, 'Customer') || ', confirming your appointment for tomorrow at 2 PM. Reply Y to confirm.'
    WHEN 2 THEN 'Reminder: Your service is scheduled for tomorrow. Our technician will arrive between 2-4 PM.'
    WHEN 3 THEN 'Thank you for choosing our services! Your invoice #INV-1001 is ready for payment.'
    WHEN 4 THEN 'Hi ' || COALESCE(c.first_name, 'Customer') || ', it''s time for your annual maintenance check. Save 15% if you book now!'
    WHEN 5 THEN 'Your technician is on the way! They should arrive within the next 30 minutes.'
    WHEN 6 THEN 'Service complete! How was your experience? Reply with a rating from 1-5 stars.'
    WHEN 7 THEN 'Special offer for valued customers: 20% off your next service. Use code SAVE20.'
    WHEN 8 THEN 'Weather alert: Due to severe conditions, we may need to reschedule appointments.'
    WHEN 9 THEN 'Happy holidays from our team! Thank you for your business this year.'
    ELSE 'Invoice reminder: Payment for invoice #INV-' || (1000 + (ROW_NUMBER() OVER (ORDER BY c.id))) || ' is due in 3 days.'
  END as body,
  'contact',
  c.id,
  NOW() - ((ROW_NUMBER() OVER (ORDER BY c.id)) * INTERVAL '1 day') - INTERVAL '2 hours',
  NOW() - ((ROW_NUMBER() OVER (ORDER BY c.id)) * INTERVAL '1 day') - INTERVAL '2 hours' + INTERVAL '5 seconds',
  NOW() - ((ROW_NUMBER() OVER (ORDER BY c.id)) * INTERVAL '1 day') - INTERVAL '2 hours'
FROM (
  SELECT * FROM contacts
  WHERE tenant_id = (SELECT id FROM tenants LIMIT 1)
  AND phone IS NOT NULL
  ORDER BY id
  LIMIT 10
) c;

-- Insert SMS inbound responses
INSERT INTO messages (tenant_id, direction, channel, from_address, to_address, body, related_type, related_id, sent_at, created_at)
SELECT
  c.tenant_id,
  'inbound',
  'sms'::message_channel,
  c.phone,
  '+15555551234',
  CASE ((ROW_NUMBER() OVER (ORDER BY c.id)) % 3)
    WHEN 0 THEN 'Yes, confirmed'
    WHEN 1 THEN '5 stars! Great service'
    ELSE 'Please call me back'
  END as body,
  'contact',
  c.id,
  NOW() - ((ROW_NUMBER() OVER (ORDER BY c.id)) * INTERVAL '1 day') - INTERVAL '1 hour',
  NOW() - ((ROW_NUMBER() OVER (ORDER BY c.id)) * INTERVAL '1 day') - INTERVAL '1 hour'
FROM (
  SELECT * FROM contacts
  WHERE tenant_id = (SELECT id FROM tenants LIMIT 1)
  AND phone IS NOT NULL
  ORDER BY id
  LIMIT 5
) c;

-- Insert email messages
INSERT INTO messages (tenant_id, direction, channel, from_address, to_address, subject, body, related_type, related_id, sent_at, delivered_at, created_at)
SELECT
  c.tenant_id,
  'outbound',
  'email'::message_channel,
  'service@fieldlite.com',
  c.email,
  CASE (ROW_NUMBER() OVER (ORDER BY c.id))
    WHEN 1 THEN 'Appointment Confirmation - Tomorrow at 2 PM'
    WHEN 2 THEN 'Invoice #INV-1002 - Payment Due'
    WHEN 3 THEN 'Service Completed - Feedback Request'
    WHEN 4 THEN 'Special Offer - Save 25% on Your Next Service'
    WHEN 5 THEN 'Annual Maintenance Reminder'
    WHEN 6 THEN 'Thank You for Your Business'
    WHEN 7 THEN 'New Services Available in Your Area'
    ELSE 'Important Account Update'
  END as subject,
  CASE (ROW_NUMBER() OVER (ORDER BY c.id))
    WHEN 1 THEN 'Dear ' || COALESCE(c.first_name, 'Customer') || E',\n\nThis email confirms your appointment scheduled for tomorrow at 2 PM.\n\nService Details:\n- Type: HVAC Maintenance\n- Duration: Approximately 1-2 hours\n- Technician: John Smith\n\nPlease ensure someone is available at the service location during this time.\n\nBest regards,\nThe FieldLite Team'
    WHEN 2 THEN 'Dear ' || COALESCE(c.first_name, 'Customer') || E',\n\nYour invoice for recent services is now available.\n\nInvoice Details:\n- Invoice Number: INV-1002\n- Amount Due: $250.00\n- Due Date: ' || (CURRENT_DATE + INTERVAL '7 days')::DATE::TEXT || E'\n\nThank you for your business!\n\nBest regards,\nAccounting Department'
    WHEN 3 THEN 'Dear ' || COALESCE(c.first_name, 'Customer') || E',\n\nThank you for choosing our services. We hope everything went smoothly with your recent appointment.\n\nWe''d love to hear about your experience. Please take a moment to rate our service.\n\nYour feedback helps us improve and serve you better.\n\nBest regards,\nCustomer Service Team'
    WHEN 4 THEN E'Dear Valued Customer,\n\nAs a thank you for your continued loyalty, we''re offering you an exclusive discount!\n\nSave 25% on your next service booking.\nOffer Code: LOYAL25\nValid until: ' || (CURRENT_DATE + INTERVAL '30 days')::DATE::TEXT || E'\n\nSchedule your service today and save!\n\nBest regards,\nThe FieldLite Team'
    WHEN 5 THEN 'Dear ' || COALESCE(c.first_name, 'Customer') || E',\n\nIt''s been a year since your last maintenance service. Regular maintenance helps:\n\n• Prevent costly repairs\n• Extend equipment life\n• Maintain warranty coverage\n• Ensure optimal performance\n\nSchedule your maintenance today and receive 10% off.\n\nBest regards,\nService Department'
    ELSE 'Dear ' || COALESCE(c.first_name, 'Customer') || E',\n\nWe have important information regarding your account.\n\nPlease log in to your customer portal to view the details.\n\nBest regards,\nThe FieldLite Team'
  END as body,
  'contact',
  c.id,
  NOW() - ((ROW_NUMBER() OVER (ORDER BY c.id)) * INTERVAL '2 days'),
  NOW() - ((ROW_NUMBER() OVER (ORDER BY c.id)) * INTERVAL '2 days') + INTERVAL '30 seconds',
  NOW() - ((ROW_NUMBER() OVER (ORDER BY c.id)) * INTERVAL '2 days')
FROM (
  SELECT * FROM contacts
  WHERE tenant_id = (SELECT id FROM tenants LIMIT 1)
  AND email IS NOT NULL
  ORDER BY id
  LIMIT 8
) c;

-- Insert voice messages (voicemail transcriptions)
INSERT INTO messages (tenant_id, direction, channel, from_address, to_address, subject, body, created_at)
SELECT
  (SELECT id FROM tenants LIMIT 1) as tenant_id,
  'inbound',
  'voice'::message_channel,
  '+1555' || LPAD(((1234567 + gs))::TEXT, 7, '0'),
  '+15555551234',
  'Voicemail Transcription',
  CASE gs
    WHEN 1 THEN 'Hi, this is John calling about my appointment tomorrow. Just wanted to confirm the time. Please call me back.'
    WHEN 2 THEN 'Hi, this is Mary Smith. I need to schedule a service call for my air conditioner. It''s not cooling properly.'
    WHEN 3 THEN 'Hello, this is Bob from Oak Street. We had service yesterday and everything is working great. Thank you!'
    ELSE 'Hi, this is a customer needing assistance. Please return my call as soon as possible.'
  END,
  NOW() - (gs * INTERVAL '1 day') - INTERVAL '3 hours'
FROM generate_series(1, 4) gs;

-- Insert WhatsApp conversation
INSERT INTO messages (tenant_id, direction, channel, from_address, to_address, body, created_at)
VALUES
  ((SELECT id FROM tenants LIMIT 1), 'inbound', 'whatsapp'::message_channel, '+15551234567', '+15555551234',
   'Hello! I saw your ad online. Can you provide a quote for AC installation?', NOW() - INTERVAL '3 hours'),
  ((SELECT id FROM tenants LIMIT 1), 'outbound', 'whatsapp'::message_channel, '+15555551234', '+15551234567',
   'Sure! I''d be happy to help. What''s the square footage of your home?', NOW() - INTERVAL '2 hours 50 minutes'),
  ((SELECT id FROM tenants LIMIT 1), 'inbound', 'whatsapp'::message_channel, '+15551234567', '+15555551234',
   'It''s about 2000 sq ft, single story', NOW() - INTERVAL '2 hours 40 minutes'),
  ((SELECT id FROM tenants LIMIT 1), 'outbound', 'whatsapp'::message_channel, '+15555551234', '+15551234567',
   'Great! For a 2000 sq ft home, installation typically ranges from $3,500-$5,000. Would you like to schedule a free consultation?', NOW() - INTERVAL '2 hours 30 minutes'),
  ((SELECT id FROM tenants LIMIT 1), 'inbound', 'whatsapp'::message_channel, '+15551234567', '+15555551234',
   'Yes, that would be perfect. What times are available?', NOW() - INTERVAL '2 hours 20 minutes'),
  ((SELECT id FROM tenants LIMIT 1), 'outbound', 'whatsapp'::message_channel, '+15555551234', '+15551234567',
   'We have availability this Thursday at 2 PM or Friday at 10 AM. Which works better for you?', NOW() - INTERVAL '2 hours 10 minutes');

-- Show summary of inserted messages
SELECT 'Messages Seeded Successfully!' as status;

SELECT
  channel::text,
  direction,
  COUNT(*) as count
FROM messages
WHERE tenant_id = (SELECT id FROM tenants LIMIT 1)
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY channel, direction
ORDER BY channel, direction;