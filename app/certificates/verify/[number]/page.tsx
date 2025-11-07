'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Award, CheckCircle, XCircle, Clock, Download, Share2 } from 'lucide-react'
import Link from 'next/link'

interface Certificate {
  id: string
  number: string
  userId: string
  courseId: string
  user: {
    id: string
    name: string
    email: string
  }
  course: {
    id: string
    title: string
    description: string | null
  }
  issuedAt: string
  expiryAt: string | null
  revokedAt: string | null
}

export default function VerifyCertificatePage() {
  const params = useParams()
  const number = params.number as string
  const [data, setData] = useState<{
    valid: boolean
    certificate: Certificate | null
    status: 'active' | 'expired' | 'revoked'
    isExpired: boolean
    isRevoked: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (number) {
      fetch(`/api/certificates/verify/${number}`)
        .then(res => res.json())
        .then(data => {
          setData(data)
          setLoading(false)
        })
        .catch(err => {
          console.error('Error verifying certificate:', err)
          setLoading(false)
        })
    }
  }, [number])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardContent className="pt-6">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-4 w-48 mx-auto mb-8" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data || !data.certificate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full border-red-200">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Certificate Not Found</CardTitle>
            <CardDescription className="mt-2">
              The certificate number you entered does not exist in our system.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/" className="text-orange-600 hover:underline">
              Return to home
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { certificate, valid, status, isExpired, isRevoked } = data

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className={`max-w-2xl w-full ${valid ? 'border-green-200' : 'border-red-200'}`}>
        <CardHeader className="text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            valid ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {valid ? (
              <CheckCircle className="h-8 w-8 text-green-600" />
            ) : (
              <XCircle className="h-8 w-8 text-red-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {valid ? 'Certificate Verified' : 'Certificate Invalid'}
          </CardTitle>
          <CardDescription className="mt-2">
            {valid 
              ? 'This certificate is valid and has been verified.'
              : status === 'revoked'
              ? 'This certificate has been revoked and is no longer valid.'
              : 'This certificate has expired and is no longer valid.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Certificate Details */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <Award className="h-5 w-5 text-orange-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">{certificate.course.title}</h3>
                  <p className="text-sm text-gray-600">Certificate #{certificate.number}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Issued To</p>
                  <p className="text-sm font-medium text-gray-900">{certificate.user.name}</p>
                  <p className="text-xs text-gray-600">{certificate.user.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Issued On</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(certificate.issuedAt).toLocaleDateString()}
                  </p>
                  {certificate.expiryAt && (
                    <>
                      <p className="text-xs text-gray-500 mt-2 mb-1">Expires On</p>
                      <p className={`text-sm font-medium ${
                        isExpired ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {new Date(certificate.expiryAt).toLocaleDateString()}
                        {isExpired && ' (Expired)'}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {certificate.course.description && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Course Description</p>
                  <p className="text-sm text-gray-700">{certificate.course.description}</p>
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-center">
              {valid ? (
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Valid Certificate
                </span>
              ) : isRevoked ? (
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                  <XCircle className="h-4 w-4 mr-2" />
                  Revoked
                </span>
              ) : (
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                  <Clock className="h-4 w-4 mr-2" />
                  Expired
                </span>
              )}
            </div>

            {/* Actions */}
            {valid && (
              <div className="flex gap-3 justify-center">
                <a
                  href={`/api/certificates/${certificate.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </a>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: `${certificate.course.title} - Certificate`,
                        text: `Certificate of Completion for ${certificate.course.title}`,
                        url: window.location.href,
                      })
                    } else {
                      navigator.clipboard.writeText(window.location.href)
                      alert('Certificate link copied to clipboard!')
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

