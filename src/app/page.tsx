// app/page.tsx
import { auth } from '@/auth'
import SplashScreen from '@/components/splashScreen'

export default async function Home() {
  const session = await auth()
  const target = session ? '/chat' : '/login'

  return <SplashScreen target={target} />
}
