import LoginForm from '@/components/LoginForm'

export default function Home() {
  // Temporarily bypass all auth logic to test if Vercel can serve the page
  return <LoginForm />
}