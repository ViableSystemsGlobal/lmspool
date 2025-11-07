'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Award, Download, Eye, Search, XCircle, CheckCircle, Clock } from 'lucide-react'
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
  }
  issuedAt: string
  expiryAt: string | null
  revokedAt: string | null
  isExpired: boolean
  isRevoked: boolean
}

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'revoked'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchCertificates()
  }, [filter])

  const fetchCertificates = () => {
    setLoading(true)
    const url = filter === 'all' 
      ? '/api/certificates' 
      : `/api/certificates?status=${filter}`
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setCertificates(data.certificates || [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching certificates:', err)
        setLoading(false)
      })
  }

  const filteredCertificates = certificates.filter(cert => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      cert.number.toLowerCase().includes(query) ||
      cert.user.name.toLowerCase().includes(query) ||
      cert.user.email.toLowerCase().includes(query) ||
      cert.course.title.toLowerCase().includes(query)
    )
  })

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
        <h1 className="text-3xl font-semibold text-gray-900">Certificates</h1>
        <p className="text-gray-600 mt-1">Manage and view all issued certificates</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                <p className="text-xs text-gray-500 mt-1">Total certificates</p>
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

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Revoked</CardTitle>
            <div className="p-2 bg-red-50 rounded-lg">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{stats.revoked}</div>
                <p className="text-xs text-gray-500 mt-1">Revoked certificates</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Certificate Registry</CardTitle>
          <CardDescription>Search and filter certificates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by certificate number, name, email, or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('active')}
              >
                Active
              </Button>
              <Button
                variant={filter === 'expired' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('expired')}
              >
                Expired
              </Button>
              <Button
                variant={filter === 'revoked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('revoked')}
              >
                Revoked
              </Button>
            </div>
          </div>

          {/* Certificates List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredCertificates.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No certificates found</h3>
              <p className="text-gray-500 text-sm">
                {filter === 'all' ? 'No certificates have been issued yet' : `No ${filter} certificates found`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCertificates.map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <Award className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">{cert.course.title}</h4>
                        {cert.isRevoked && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Revoked
                          </span>
                        )}
                        {cert.isExpired && !cert.isRevoked && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Expired
                          </span>
                        )}
                        {!cert.isExpired && !cert.isRevoked && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {cert.user.name} ({cert.user.email})
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Certificate #{cert.number} • Issued {new Date(cert.issuedAt).toLocaleDateString()}
                        {cert.expiryAt && ` • Expires ${new Date(cert.expiryAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/certificates/verify/${cert.number}`, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/api/certificates/${cert.id}/download`, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

