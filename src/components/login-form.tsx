import { auth, signIn } from '@/auth'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { redirect } from 'next/navigation'

export async function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const session = await auth() // universal auth()
  if (session) {
    return redirect('/chat')
  }
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center flex flex-col justify-center align-middle">
          <div className="w-full h-auto flex align-middle justify-center">
            <div className=" bg-primary rounded-sm p-2 px-4">
              <p className="text-primary-foreground font-bold text-4xl">
                me<span className="uppercase">diz</span>
                <span className="text-yellow-400">!</span>
              </p>
            </div>
          </div>
          <CardTitle className="text-xl">Bem-vindo</CardTitle>
          <CardDescription>
            Realize o login com sua conta do Google ou Facebook
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              'use server'
              await signIn('google')
            }}
          >
            <div className="grid gap-6">
              <div className="flex flex-col gap-4">
                <Button
                  variant="outline"
                  className="w-full bg-primary hover:opacity-90 transition-opacity"
                  type="submit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  Login com Google
                </Button>
                {/* <Button variant="outline" className="w-full">
                  <Facebook size={24} />
                  Login com Facebook
                </Button> */}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
        Ao clicar em continuar, você concorda com nossos{' '}
        <a href="#">Termos de Serviço</a> e{' '}
        <a href="#">Política de Privacidade</a>.
      </div>
    </div>
  )
}
