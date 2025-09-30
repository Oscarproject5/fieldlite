'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SeedDataPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const seedMessages = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/seed/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to seed messages');
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Seed Demo Data</CardTitle>
          <CardDescription>
            Click the button below to populate the database with sample messages for testing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={seedMessages}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? 'Seeding Messages...' : 'Seed Sample Messages'}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 text-red-900 rounded-md">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 text-green-900 rounded-md">
              <p className="font-semibold">Success!</p>
              <p>{result.message}</p>
              {result.summary && (
                <div className="mt-2">
                  <p className="font-semibold">Summary:</p>
                  <ul className="list-disc list-inside">
                    <li>SMS: {result.summary.sms || 0} messages</li>
                    <li>Email: {result.summary.email || 0} messages</li>
                    <li>Internal: {result.summary.internal || 0} messages</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="text-sm text-gray-500 mt-4">
            <p>Note: This will create sample messages associated with existing contacts in your database.</p>
            <p>Make sure you have some contacts created first.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}