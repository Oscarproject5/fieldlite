const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mock message templates
const messageTemplates = {
  sms: [
    "Hi {name}, just confirming your appointment for {date}. Reply Y to confirm.",
    "Reminder: Your service is scheduled for tomorrow at {time}.",
    "Thank you for choosing our services! Your invoice #{invoiceNumber} is ready.",
    "Hi {name}, it's time for your annual maintenance check. Save 15% if you book now!",
    "Your technician is on the way! ETA: 30 minutes.",
    "Service complete! Please rate your experience from 1-5 stars.",
    "Special offer: 20% off your next service. Use code SAVE20.",
    "Invoice reminder: Payment for #{invoiceNumber} is due in 3 days."
  ],
  email: [
    {
      subject: "Appointment Confirmation",
      body: "Your appointment is confirmed for tomorrow at 2 PM. Our technician will arrive between 2-4 PM."
    },
    {
      subject: "Invoice Ready",
      body: "Your invoice for recent services is now available. Amount due: $250.00"
    },
    {
      subject: "Service Feedback Request",
      body: "Thank you for choosing our services. Please take a moment to rate your experience."
    },
    {
      subject: "Special Offer - 25% Off",
      body: "As a valued customer, you're eligible for 25% off your next service. Use code LOYAL25."
    }
  ],
  internal: [
    "New lead assigned: John Doe - 555-1234 - Interested in HVAC service",
    "High priority: Customer complaint needs immediate attention",
    "Team update: 5 jobs completed today, $3,500 in revenue",
    "Inventory alert: Air filters running low",
    "Schedule change: Tech called in sick, need coverage for tomorrow"
  ]
};

async function seedMessages() {
  try {
    console.log('Authenticating...');

    // Sign in with the test user credentials if needed
    // For now, we'll try to work with existing session or you can add auth here

    // Get the first tenant
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .limit(1);

    if (tenantError || !tenants || tenants.length === 0) {
      console.error('Error fetching tenant:', tenantError);

      // Create a default tenant if none exists
      console.log('Creating default tenant...');
      const { data: newTenant, error: createError } = await supabase
        .from('tenants')
        .insert({
          name: 'Demo Company',
          subdomain: 'demo',
          plan: 'pro'
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create tenant:', createError);
        return;
      }

      tenants[0] = newTenant;
    }

    const tenantId = tenants[0].id;
    console.log('Using tenant ID:', tenantId);

    // Get or create contacts
    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone')
      .eq('tenant_id', tenantId)
      .limit(5);

    if (contactError) {
      console.error('Error fetching contacts:', contactError);
    }

    // If no contacts, create some
    if (!contacts || contacts.length === 0) {
      console.log('Creating sample contacts...');
      const sampleContacts = [
        { tenant_id: tenantId, first_name: 'John', last_name: 'Smith', email: 'john@example.com', phone: '+15551234567' },
        { tenant_id: tenantId, first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com', phone: '+15551234568' },
        { tenant_id: tenantId, first_name: 'Bob', last_name: 'Johnson', email: 'bob@example.com', phone: '+15551234569' }
      ];

      const { data: newContacts, error: insertError } = await supabase
        .from('contacts')
        .insert(sampleContacts)
        .select();

      if (insertError) {
        console.error('Failed to create contacts:', insertError);
        return;
      }

      contacts.push(...newContacts);
    }

    console.log(`Found/created ${contacts.length} contacts`);

    // Generate messages
    const messages = [];
    const now = new Date();

    // SMS messages
    contacts.forEach((contact, index) => {
      if (contact.phone && index < messageTemplates.sms.length) {
        const template = messageTemplates.sms[index];
        const body = template
          .replace('{name}', contact.first_name || 'Customer')
          .replace('{date}', new Date(now.getTime() + 86400000).toLocaleDateString())
          .replace('{time}', '2:00 PM')
          .replace('{invoiceNumber}', `INV-${1000 + index}`);

        messages.push({
          tenant_id: tenantId,
          direction: 'outbound',
          channel: 'sms',
          from_address: '+15555551234',
          to_address: contact.phone,
          body: body,
          related_type: 'contact',
          related_id: contact.id,
          sent_at: new Date(now.getTime() - index * 3600000).toISOString(),
          created_at: new Date(now.getTime() - index * 3600000).toISOString()
        });
      }

      // Email messages
      if (contact.email && index < messageTemplates.email.length) {
        const emailTemplate = messageTemplates.email[index];
        messages.push({
          tenant_id: tenantId,
          direction: 'outbound',
          channel: 'email',
          from_address: 'service@fieldlite.com',
          to_address: contact.email,
          subject: emailTemplate.subject,
          body: emailTemplate.body,
          related_type: 'contact',
          related_id: contact.id,
          sent_at: new Date(now.getTime() - index * 86400000).toISOString(),
          created_at: new Date(now.getTime() - index * 86400000).toISOString()
        });
      }
    });

    // Internal messages
    messageTemplates.internal.forEach((template, index) => {
      messages.push({
        tenant_id: tenantId,
        direction: 'outbound',
        channel: 'internal',
        from_address: 'system@fieldlite.com',
        to_address: 'team@fieldlite.com',
        subject: 'System Notification',
        body: template,
        created_at: new Date(now.getTime() - index * 7200000).toISOString()
      });
    });

    console.log(`Inserting ${messages.length} messages...`);

    // Insert messages
    const { data: insertedMessages, error: insertError } = await supabase
      .from('messages')
      .insert(messages)
      .select();

    if (insertError) {
      console.error('Error inserting messages:', insertError);
    } else {
      console.log(`Successfully inserted ${insertedMessages.length} messages`);
    }

    // Display summary
    const { count: totalCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    console.log(`\nTotal messages in database: ${totalCount}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

seedMessages().then(() => {
  console.log('Done!');
  process.exit(0);
});