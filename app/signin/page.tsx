'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTheme } from '@/contexts/theme-context'
import { useBranding } from '@/contexts/branding-context'
import { GraduationCap, Mail, Lock, ArrowLeft } from 'lucide-react'

export default function SignInPage() {
  const router = useRouter()
  const { getThemeColor } = useTheme()
  const { branding } = useBranding()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage('We\'ve sent a 6-digit code to your email.')
        setStep('code')
      } else {
        setError(data.error || 'Failed to send code')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })

      const data = await res.json()

      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setError(data.error || 'Invalid code. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {branding.companyLogo ? (
              <img
                src={branding.companyLogo}
                alt={branding.companyName || 'Logo'}
                className="h-16 w-auto max-w-full rounded-lg object-contain"
              />
            ) : (
              <div 
                className="h-16 w-16 rounded-xl flex items-center justify-center shadow-lg"
                style={{
                  background: `linear-gradient(to bottom right, ${getThemeColor()}, ${getThemeColor()}dd)`
                }}
              >
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{branding.companyName || 'Welcome to LMS'}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {branding.description || 'Learning Management System'}
          </p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">
              {step === 'email' ? 'Sign In' : 'Enter Verification Code'}
            </CardTitle>
            <CardDescription>
              {step === 'email' 
                ? 'Enter your email to receive a one-time code'
                : `Enter the 6-digit code sent to ${email}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'email' ? (
              <form className="space-y-4" onSubmit={handleEmailSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <div className="text-sm text-red-800">{error}</div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </Button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleCodeSubmit}>
                {message && (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                    <div className="text-sm text-green-800">{message}</div>
                  </div>
                )}

                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="code"
                      name="code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      className="pl-10 text-center text-2xl tracking-widest font-mono"
                      placeholder="000000"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Check your email for the 6-digit code
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <div className="text-sm text-red-800">{error}</div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setStep('email')
                      setCode('')
                      setError('')
                      setMessage('')
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="flex-1"
                  >
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
