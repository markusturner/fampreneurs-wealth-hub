import { Navigate, useLocation } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'
import WorkspaceCommunity from '@/pages/WorkspaceCommunity'
import { MARKUS_COMMUNITY } from '@/lib/markus-member'

// Markus AI members get their own family office and community pages inside the Markus area,
// so the Markus menu stays on screen and they never land on the program-member versions.
export function MarkusFamilyOfficePage() {
  return <Dashboard />
}

export function MarkusCommunityPage() {
  const { pathname, search } = useLocation()
  const params = new URLSearchParams(search)
  if (params.get('program') !== MARKUS_COMMUNITY) {
    params.set('program', MARKUS_COMMUNITY)
    return <Navigate to={`${pathname}?${params.toString()}`} replace />
  }
  return <WorkspaceCommunity />
}
