// Device detection utilities

export interface DeviceInfo {
  deviceType: 'mobile' | 'tablet' | 'desktop'
  browser: string
  os: string
  userAgent: string
}

export function getDeviceInfo(): DeviceInfo {
  const userAgent = navigator.userAgent
  
  // Detect device type
  const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent)
  const deviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
  
  // Detect browser
  let browser = 'Unknown'
  if (userAgent.includes('Firefox')) browser = 'Firefox'
  else if (userAgent.includes('Edg')) browser = 'Edge'
  else if (userAgent.includes('Chrome')) browser = 'Chrome'
  else if (userAgent.includes('Safari')) browser = 'Safari'
  else if (userAgent.includes('Opera') || userAgent.includes('OPR')) browser = 'Opera'
  
  // Detect OS
  let os = 'Unknown'
  if (userAgent.includes('Windows')) os = 'Windows'
  else if (userAgent.includes('Mac')) os = 'macOS'
  else if (userAgent.includes('Linux')) os = 'Linux'
  else if (userAgent.includes('Android')) os = 'Android'
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS'
  
  return {
    deviceType,
    browser,
    os,
    userAgent
  }
}

export async function getIPAddress(): Promise<string> {
  try {
    // Use a free IP detection service
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip || 'Unknown'
  } catch (error) {
    console.error('Failed to get IP address:', error)
    return 'Unknown'
  }
}
