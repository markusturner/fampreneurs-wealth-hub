// Navigation utilities for the landing page

export const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

export const navigateToRoute = (path: string) => {
  window.location.href = path
}

export const openExternalLink = (url: string, newTab = true) => {
  if (newTab) {
    window.open(url, '_blank', 'noopener,noreferrer')
  } else {
    window.location.href = url
  }
}

export const openEmailClient = (email: string, subject?: string, body?: string) => {
  let mailto = `mailto:${email}`
  const params = []
  
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`)
  if (body) params.push(`body=${encodeURIComponent(body)}`)
  
  if (params.length > 0) {
    mailto += `?${params.join('&')}`
  }
  
  window.open(mailto, '_blank')
}

export const openPhoneDialer = (phoneNumber: string) => {
  window.open(`tel:${phoneNumber}`, '_blank')
}

// Social media links - replace with actual company profiles
export const socialLinks = {
  facebook: 'https://facebook.com/thefampreneurs',
  twitter: 'https://twitter.com/thefampreneurs', 
  linkedin: 'https://linkedin.com/company/thefampreneurs',
  instagram: 'https://www.instagram.com/thefampreneurs/'
}

// Contact information
export const contactInfo = {
  email: 'support@truheirs.com',
  phone: '1-800-TRU-HEIR',
  demoEmail: 'demo@truheirs.com'
}