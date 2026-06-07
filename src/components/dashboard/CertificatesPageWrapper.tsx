// src/components/dashboard/CertificatesPageWrapper.tsx
// Thin wrapper: adds DashboardLayout sidebar around existing CertificatesPage
// CertificatesPage itself is UNCHANGED

import DashboardLayout from './DashboardLayout'
import CertificatesPage from '../certificate/CertificatesPage'

export default function CertificatesPageWrapper() {
  return (
    <DashboardLayout activeSection="certificates">
      <CertificatesPage />
    </DashboardLayout>
  )
}
