import { auth, signIn } from '@/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { redirect } from 'next/navigation'
import GoogleIcon from './icons/Google'

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
      <Card className="bg-zinc-50 border-zinc-300 shadow-lg">
        <CardHeader className="text-center flex flex-col justify-center align-middle">
          <div className="w-full flex flex-col items-center justify-center gap-2">
            <div className="w-full h-auto flex align-middle justify-center">
              <p className="text-primary font-bold text-4xl">
                me<span className="uppercase">diz</span>
                <span className="text-yellow-400">!</span>
              </p>
            </div>
            <hr className="w-1/12 border border-indigo-600 rounded-sm " />
            <div className="p-1 rounded-sm bg-zinc-100 shadow-sm my-4 mb-10">
              <p className="text-zinc-500">
                <span className="text-indigo-600">12,460 </span>pessoas já
                usaram
              </p>
            </div>
          </div>
          <CardTitle className="text-xl text-zinc-800">
            Escolha como entrar
          </CardTitle>
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
                  className="w-full min-h-12 bg-zinc-100 border-zinc-200 shadow-sm hover:opacity-90 hover:bg-zinc-100 hover:text-zinc-800 hover:shadow-md transition-all text-zinc-800 text-base"
                  type="submit"
                >
                  <GoogleIcon />
                  Continuar com Google
                </Button>
                {/* <Button variant="outline" className="w-full">
                  <Facebook size={24} />
                  Login com Facebook
                </Button> */}
              </div>
            </div>
          </form>
          <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary text-zinc-500 mt-10">
            Ao clicar em continuar, você concorda com nossos{' '}
            <a href="#" className="text-indigo-600">
              Termos de Serviço
            </a>{' '}
            e{' '}
            <a href="#" className="text-indigo-600">
              Política de Privacidade
            </a>
            .
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
