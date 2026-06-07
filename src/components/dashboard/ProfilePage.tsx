// src/components/dashboard/ProfilePage.tsx
// Thin wrapper: adds DashboardLayout sidebar around existing ProfileEditor
// ProfileEditor itself is UNCHANGED

import DashboardLayout from './DashboardLayout'
import ProfileEditor from './ProfileEditor'

export default function ProfilePage() {
  return (
    <DashboardLayout activeSection="profile">
      <ProfileEditor />
    </DashboardLayout>
  )
}
