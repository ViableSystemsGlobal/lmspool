'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Award, Download, Share2, CheckCircle, Clock, XCircle } from 'lucide-react'

interface Certificate {
  id: string
  number: string
  courseId: string
  course: {
    id: string
    title: string
  }
  issuedAt: string
  expiryAt: string | null
  revokedAt: string | null
  isExpired: boolean
  isRevoked: boolean
  qrCodeUrl: string | null
}

export default function MyCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/certificates')
      .then(res => res.json())
      .then(data => {
        setCertificates(data.certificates || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching certificates:', err)
        setLoading(false)
      })
  }, [])

  const stats = {
    total: certificates.length,
    active: certificates.filter(c => !c.isExpired && !c.isRevoked).length,
    expired: certificates.filter(c => c.isExpired && !c.isRevoked).length,
    revoked: certificates.filter(c => c.isRevoked).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">My Certificates</h1>
        <p className="text-gray-600 mt-1">View and download your certificates</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Award className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <p className="text-xs text-gray-500 mt-1">Certificates earned</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active</CardTitle>
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{stats.active}</div>
                <p className="text-xs text-gray-500 mt-1">Valid certificates</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Expired</CardTitle>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{stats.expired}</div>
                <p className="text-xs text-gray-500 mt-1">Expired certificates</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Certificates List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Certificates</CardTitle>
          <CardDescription>Your earned certificates</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No certificates yet</h3>
              <p className="text-gray-500 text-sm">Complete courses to earn certificates</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {certificates.map((cert) => (
                <Card key={cert.id} className="border-2 border-gray-200 hover:border-orange-300 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-orange-50 rounded-lg">
                          <Award className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{cert.course.title}</CardTitle>
                          <CardDescription className="mt-1">
                            Certificate #{cert.number}
                          </CardDescription>
                        </div>
                      </div>
                      {cert.isRevoked ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Revoked
                        </span>
                      ) : cert.isExpired ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600">
                        <p><strong>Issued:</strong> {new Date(cert.issuedAt).toLocaleDateString()}</p>
                        {cert.expiryAt && (
                          <p className="mt-1">
                            <strong>Expires:</strong> {new Date(cert.expiryAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => window.open(`/api/certificates/${cert.id}/download`, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/certificates/verify/${cert.number}`, '_blank')}
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

