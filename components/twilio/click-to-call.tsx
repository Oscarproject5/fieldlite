'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Phone, PhoneCall, Loader2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'

interface ClickToCallProps {
  phoneNumber: string
  contactId?: string
  dealId?: string
  jobId?: string
  label?: string
  variant?: 'default' | 'outline' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function ClickToCall({
  phoneNumber,
  contactId,
  dealId,
  jobId,
  label,
  variant = 'outline',
  size = 'icon',
  className
}: ClickToCallProps) {
  const [calling, setCalling] = useState(false)

  const initiateCall = async () => {
    setCalling(true)

    try {
      const response = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          contactId,
          dealId,
          jobId,
          record: false // You can make this configurable
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Call initiated', {
          description: `Connecting to ${phoneNumber}...`
        })
      } else {
        if (data.error?.includes('not configured')) {
          toast.error('Twilio not configured', {
            description: 'Please set up your Twilio account in settings.',
            action: {
              label: 'Go to Settings',
              onClick: () => window.location.href = '/settings/twilio'
            }
          })
        } else {
          toast.error('Failed to initiate call', {
            description: data.error || 'Please try again'
          })
        }
      }
    } catch (error) {
      toast.error('Connection error', {
        description: 'Failed to connect. Please check your connection.'
      })
    } finally {
      setCalling(false)
    }
  }

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '')

    // Format as (XXX) XXX-XXXX for US numbers
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }

    return phone
  }

  if (size === 'icon') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              onClick={initiateCall}
              disabled={calling}
              className={className}
            >
              {calling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Phone className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Call {formatPhoneNumber(phoneNumber)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={initiateCall}
      disabled={calling}
      className={className}
    >
      {calling ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Calling...
        </>
      ) : (
        <>
          <PhoneCall className="mr-2 h-4 w-4" />
          {label || formatPhoneNumber(phoneNumber)}
        </>
      )}
    </Button>
  )
}