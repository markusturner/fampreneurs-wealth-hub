import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Hero } from '@/components/landing/Hero'
import { Features } from '@/components/landing/Features'
import { Pricing } from '@/components/landing/Pricing'
import { FAQ } from '@/components/landing/FAQ'
import { Footer } from '@/components/landing/Footer'
import { BuildInfo } from '@/components/BuildInfo'

const Landing = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <Features />
      <Pricing />
      <FAQ />
      <Footer />
      <BuildInfo />
    </div>
  )
}

export default Landing