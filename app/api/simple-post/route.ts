export async function POST() {
  return Response.json({ success: true, message: 'POST works!' });
}

export async function GET() {
  return Response.json({ message: 'GET works! Use POST instead.' });
}