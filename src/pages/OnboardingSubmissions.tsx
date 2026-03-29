import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function OnboardingSubmissions() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/admin-settings', { replace: true })
  }, [navigate])

  return null
}
