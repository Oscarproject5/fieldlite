import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Mock message templates
const messageTemplates = {
  sms: [
    "Hi {name}, just confirming your appointment for {date}. Reply Y to confirm or call us to reschedule.",
    "Reminder: Your service is scheduled for tomorrow at {time}. Our technician will arrive between {timeRange}.",
    "Thank you for choosing our services! Your invoice #{invoiceNumber} is ready.",
    "Hi {name}, it's time for your annual maintenance check. Schedule now and save 15%!",
    "Your technician is on the way! They should arrive within the next 30 minutes.",
    "Service complete! How was your experience? Reply with a rating from 1-5 stars.",
    "Special offer for valued customers: 20% off your next service. Use code SAVE20.",
    "Weather alert: Due to severe conditions, we may need to reschedule appointments.",
    "Happy holidays from our team! Thank you for your business this year.",
    "Invoice reminder: Payment for invoice #{invoiceNumber} is due in 3 days."
  ],
  email: [
    {
      subject: "Appointment Confirmation - {date}",
      body: "Dear {name},\n\nThis email confirms your appointment scheduled for {date} at {time}.\n\nService Details:\n- Type: {serviceType}\n- Duration: Approximately {duration}\n- Technician: {techName}\n\nPlease ensure someone is available at the service location during this time.\n\nBest regards,\nThe FieldLite Team"
    },
    {
      subject: "Invoice #{invoiceNumber} - Payment Due",
      body: "Dear {name},\n\nYour invoice for recent services is now available.\n\nInvoice Details:\n- Invoice Number: {invoiceNumber}\n- Amount Due: ${amount}\n- Due Date: {dueDate}\n\nThank you for your business!\n\nBest regards,\nAccounting Department"
    },
    {
      subject: "Service Completed - Feedback Request",
      body: "Dear {name},\n\nThank you for choosing our services. We hope everything went smoothly with your recent appointment.\n\nWe'd love to hear about your experience. Please take a moment to rate our service.\n\nYour feedback helps us improve and serve you better.\n\nBest regards,\nCustomer Service Team"
    },
    {
      subject: "Special Offer - Save on Your Next Service",
      body: "Dear Valued Customer,\n\nAs a thank you for your continued loyalty, we're offering you an exclusive discount!\n\nSave 25% on your next service booking.\nOffer Code: LOYAL25\n\nSchedule your service today and save!\n\nBest regards,\nThe FieldLite Team"
    },
    {
      subject: "Annual Maintenance Reminder",
      body: "Dear {name},\n\nIt's been a year since your last maintenance service. Regular maintenance helps:\n\n• Prevent costly repairs\n• Extend equipment life\n• Maintain warranty coverage\n• Ensure optimal performance\n\nSchedule your maintenance today and receive 10% off.\n\nBest regards,\nService Department"
    }
  ],
  internal: [
    "New lead assigned: {leadName} - {phone} - Interested in {service}",
    "High priority: Customer complaint from {name} regarding {issue}",
    "Team update: {techName} completed {jobCount} jobs today",
    "Inventory alert: {item} running low, only {quantity} remaining",
    "Schedule change: {techName} called in sick, need coverage for {date}",
    "New review received: {rating} stars from {customerName}",
    "Payment received: ${amount} from {customerName} for invoice #{invoiceNumber}",
    "Emergency call: {address} - {issue} - Customer requesting immediate service",
    "Daily summary: {completedJobs} jobs completed, {revenue} in revenue",
    "Training reminder: Safety meeting scheduled for {date} at {time}"
  ]
};

export async function POST() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's tenant
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const tenantId = profile.tenant_id;

    // Get contacts for messaging
    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone')
      .eq('tenant_id', tenantId)
      .limit(10);

    if (contactError || !contacts || contacts.length === 0) {
      return NextResponse.json({ error: 'No contacts found' }, { status: 400 });
    }

    // Generate messages
    const messages = [];
    const now = new Date();

    // Generate SMS messages
    contacts.forEach((contact, index) => {
      if (contact.phone) {
        // Outbound SMS
        const smsTemplate = messageTemplates.sms[index % messageTemplates.sms.length];
        const smsBody = smsTemplate
          .replace('{name}', contact.first_name || 'Customer')
          .replace('{date}', new Date(now.getTime() + index * 86400000).toLocaleDateString())
          .replace('{time}', '2:00 PM')
          .replace('{timeRange}', '2:00 PM - 4:00 PM')
          .replace('{invoiceNumber}', `INV-${1000 + index}`);

        messages.push({
          tenant_id: tenantId,
          user_id: user.id,
          direction: 'outbound',
          channel: 'sms',
          from_address: '+15555551234',
          to_address: contact.phone,
          body: smsBody,
          related_type: 'contact',
          related_id: contact.id,
          sent_at: new Date(now.getTime() - index * 3600000 * 4).toISOString(),
          delivered_at: new Date(now.getTime() - index * 3600000 * 4 + 5000).toISOString(),
          created_at: new Date(now.getTime() - index * 3600000 * 4).toISOString()
        });

        // Inbound SMS response (for some messages)
        if (index % 3 === 0) {
          messages.push({
            tenant_id: tenantId,
            user_id: user.id,
            direction: 'inbound',
            channel: 'sms',
            from_address: contact.phone,
            to_address: '+15555551234',
            body: ['Yes, confirmed', 'Please reschedule for next week', '5 stars! Great service', 'Y'][index % 4],
            related_type: 'contact',
            related_id: contact.id,
            sent_at: new Date(now.getTime() - index * 3600000 * 4 + 1800000).toISOString(),
            created_at: new Date(now.getTime() - index * 3600000 * 4 + 1800000).toISOString()
          });
        }
      }

      // Email messages
      if (contact.email && index < messageTemplates.email.length) {
        const emailTemplate = messageTemplates.email[index % messageTemplates.email.length];
        const emailSubject = emailTemplate.subject
          .replace('{date}', new Date(now.getTime() + index * 86400000).toLocaleDateString())
          .replace('{invoiceNumber}', `INV-${1000 + index}`);

        const emailBody = emailTemplate.body
          .replace(/\{name\}/g, `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Customer')
          .replace(/\{date\}/g, new Date(now.getTime() + index * 86400000).toLocaleDateString())
          .replace('{time}', '2:00 PM')
          .replace('{serviceType}', ['HVAC Maintenance', 'Plumbing Repair', 'Electrical Inspection'][index % 3])
          .replace('{duration}', '1-2 hours')
          .replace('{techName}', ['John Smith', 'Mike Johnson', 'Sarah Williams'][index % 3])
          .replace(/\{invoiceNumber\}/g, `INV-${1000 + index}`)
          .replace('{amount}', (250 + index * 50).toFixed(2))
          .replace('{dueDate}', new Date(now.getTime() + 7 * 86400000).toLocaleDateString());

        messages.push({
          tenant_id: tenantId,
          user_id: user.id,
          direction: 'outbound',
          channel: 'email',
          from_address: 'service@fieldlite.com',
          to_address: contact.email,
          subject: emailSubject,
          body: emailBody,
          related_type: 'contact',
          related_id: contact.id,
          sent_at: new Date(now.getTime() - index * 86400000).toISOString(),
          delivered_at: new Date(now.getTime() - index * 86400000 + 30000).toISOString(),
          created_at: new Date(now.getTime() - index * 86400000).toISOString()
        });
      }
    });

    // Generate internal messages
    for (let i = 0; i < 10; i++) {
      const template = messageTemplates.internal[i % messageTemplates.internal.length];
      const body = template
        .replace('{leadName}', ['John Doe', 'Jane Smith', 'Bob Wilson'][i % 3])
        .replace('{phone}', '555-' + String(1000 + i).padStart(4, '0'))
        .replace('{service}', ['HVAC Installation', 'Plumbing Repair', 'Electrical Upgrade'][i % 3])
        .replace('{name}', ['Customer A', 'Customer B', 'Customer C'][i % 3])
        .replace('{issue}', ['Late arrival', 'Incomplete work', 'Billing error'][i % 3])
        .replace('{techName}', ['Tech 1', 'Tech 2', 'Tech 3'][i % 3])
        .replace('{jobCount}', String(3 + i % 5))
        .replace('{item}', ['Copper pipes', 'Circuit breakers', 'Air filters'][i % 3])
        .replace('{quantity}', String(5 + i % 10))
        .replace('{date}', new Date(now.getTime() + i * 86400000).toLocaleDateString())
        .replace('{time}', ['9:00 AM', '2:00 PM', '4:00 PM'][i % 3])
        .replace('{rating}', String(3 + i % 3))
        .replace('{customerName}', ['Happy Customer', 'Satisfied Client', 'Regular Customer'][i % 3])
        .replace('{amount}', (500 + i * 100).toFixed(2))
        .replace('{invoiceNumber}', `INV-${2000 + i}`)
        .replace('{address}', `${100 + i} Main St`)
        .replace('{completedJobs}', String(10 + i))
        .replace('{revenue}', '$' + (5000 + i * 500).toFixed(2));

      messages.push({
        tenant_id: tenantId,
        user_id: user.id,
        direction: 'outbound',
        channel: 'internal',
        from_address: 'system@fieldlite.com',
        to_address: 'team@fieldlite.com',
        subject: 'System Notification',
        body: body,
        created_at: new Date(now.getTime() - i * 7200000).toISOString()
      });
    }

    // Insert messages in batches
    const batchSize = 10;
    let insertedCount = 0;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('messages')
        .insert(batch);

      if (insertError) {
        console.error('Error inserting messages:', insertError);
      } else {
        insertedCount += batch.length;
      }
    }

    // Get message counts by channel
    const { data: smsCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('channel', 'sms');

    const { data: emailCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('channel', 'email');

    const { data: internalCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('channel', 'internal');

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${insertedCount} messages`,
      summary: {
        sms: smsCount,
        email: emailCount,
        internal: internalCount
      }
    });

  } catch (error) {
    console.error('Error seeding messages:', error);
    return NextResponse.json({
      error: 'Failed to seed messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}