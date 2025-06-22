import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the actual homepage hosted on BlueHost
    // Change this URL to your actual BlueHost domain
    window.location.href = 'https://windscreencompare.com'
  }, [])

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1>Redirecting...</h1>
      <p>If you are not redirected automatically, please visit our homepage at <a href="https://windscreencompare.com">windscreencompare.com</a></p>
    </div>
  )
}
