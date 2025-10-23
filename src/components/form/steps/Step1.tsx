'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserForm } from '@/hooks/use-form-data'
import { formatPhone } from '@/lib/formatPhone'
import { ArrowRight } from 'lucide-react'
import Image from 'next/image'

interface UserApiResponse {
  fullName: string
  whatsapp: string
  email: string
  image: string | null
}

export default function Step1() {
  const { form, nextStep } = useUserForm()
  const [userImage, setUserImage] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/user')
        const data: UserApiResponse = await res.json()
        form.setValue('fullName', data.fullName ?? '')
        form.setValue('whatsapp', data.whatsapp ?? '')
        setUserEmail(data.email)
        setUserImage(data.image)
      } finally {
        setIsLoading(false)
      }
    }
    fetchUser()
  }, [form])

  const handleStep1Submit = async () => {
    const isValid = await form.trigger(['fullName', 'whatsapp'])
    if (isValid) nextStep()
  }

  return (
    <div>
      <div className="flex flex-col items-center justify-center w-full gap-4">
        <p className="text-indigo-600 text-2xl font-bold">
          Bem-vindo ao meDIZ!
        </p>
        <p className="text-zinc-600 font-light text-center">
          Vamos começar com algumas informações básicas
        </p>
      </div>
      <Form {...form}>
        <form
          onSubmit={e => {
            e.preventDefault()
            handleStep1Submit()
          }}
          className="space-y-4 w-full mt-8 flex flex-col items-center text-zinc-600 pb-20"
        >
          {isLoading ? (
            <Skeleton className="h-24 w-24 rounded-full" />
          ) : userImage ? (
            <Image
              src={userImage}
              alt="User"
              width={104}
              height={104}
              className="rounded-full border-4 border-indigo-600"
            />
          ) : null}

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel className="text-base">Nome completo</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isLoading}
                    placeholder="Digite seu nome completo"
                    className="min-h-14 text-base placeholder:text-base bg-zinc-50 border-2 border-zinc-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem className="w-full">
            <FormLabel className="text-base">Email</FormLabel>
            <FormControl>
              {isLoading ? (
                <Skeleton className="h-14 w-full rounded-md" />
              ) : (
                <Input
                  value={userEmail}
                  readOnly
                  className="min-h-14 text-base placeholder:text-base bg-zinc-50 border-2 border-zinc-300"
                />
              )}
            </FormControl>
          </FormItem>

          <FormField
            control={form.control}
            name="whatsapp"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel className="text-base">WhatsApp</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isLoading}
                    value={field.value}
                    onChange={e => field.onChange(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    className="min-h-14 text-base placeholder:text-base bg-zinc-50 border-2 border-zinc-300"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="w-full flex items-center justify-end fixed bottom-4 left-0 right-0 px-4">
            <Button type="submit" className="w-1/3 min-h-14">
              Próximo <ArrowRight />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
