import twilio from 'twilio';
import { headers } from 'next/headers';

/**
 * Validates that a webhook request is actually from Twilio
 * This prevents unauthorized access to our webhook endpoints
 */
export async function validateTwilioWebhook(
  request: Request,
  authToken: string
): Promise<boolean> {
  try {
    const headersList = await headers();
    const signature = headersList.get('x-twilio-signature');

    if (!signature) {
      console.warn('No Twilio signature found in webhook request');
      return false;
    }

    // Get the full URL
    const url = request.url;

    // Get the request body
    const body = await request.text();
    const params = new URLSearchParams(body);
    const paramsObject: { [key: string]: string } = {};

    params.forEach((value, key) => {
      paramsObject[key] = value;
    });

    // Validate the request
    const isValid = twilio.validateRequest(
      authToken,
      signature,
      url,
      paramsObject
    );

    if (!isValid) {
      console.warn('Invalid Twilio webhook signature');
    }

    return isValid;
  } catch (error) {
    console.error('Error validating Twilio webhook:', error);
    return false;
  }
}

/**
 * Extracts call data from Twilio webhook request
 */
export async function extractCallData(request: Request) {
  const body = await request.text();
  const params = new URLSearchParams(body);

  return {
    callSid: params.get('CallSid'),
    from: params.get('From'),
    to: params.get('To'),
    callStatus: params.get('CallStatus'),
    direction: params.get('Direction'),
    duration: params.get('CallDuration'),
    recordingUrl: params.get('RecordingUrl'),
    recordingSid: params.get('RecordingSid'),
    recordingDuration: params.get('RecordingDuration'),
    timestamp: params.get('Timestamp'),
    answeredBy: params.get('AnsweredBy'),
    price: params.get('Price'),
    priceUnit: params.get('PriceUnit'),
  };
}

/**
 * Maps Twilio call status to our database enum
 */
export function mapTwilioStatus(twilioStatus: string): string {
  const statusMap: { [key: string]: string } = {
    'queued': 'queued',
    'initiated': 'queued',
    'ringing': 'ringing',
    'in-progress': 'in-progress',
    'completed': 'completed',
    'busy': 'busy',
    'failed': 'failed',
    'no-answer': 'no-answer',
    'canceled': 'canceled'
  };

  return statusMap[twilioStatus?.toLowerCase()] || 'failed';
}