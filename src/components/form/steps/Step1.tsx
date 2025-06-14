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
import { useUserForm } from '@/hooks/use-form-data'
import { formatPhone } from '@/lib/formatPhone'
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

  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch('/api/user')
      const data: UserApiResponse = await res.json()
      form.setValue('fullName', data.fullName ?? '')
      form.setValue('whatsapp', data.whatsapp ?? '')
      setUserEmail(data.email)
      setUserImage(data.image)
    }
    fetchUser()
  }, [form])

  const handleStep1Submit = async () => {
    const isValid = await form.trigger(['fullName', 'whatsapp'])
    if (isValid) nextStep()
  }

  return (
    <Form {...form}>
      <form
        onSubmit={e => {
          e.preventDefault()
          handleStep1Submit()
        }}
        className="space-y-4 w-full mt-8 flex flex-col items-center"
      >
        {userImage && (
          <Image
            src={userImage}
            alt="User"
            width={104}
            height={104}
            className="rounded-full border-4 border-indigo-600"
          />
        )}

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel className="text-base">Nome completo</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Digite seu nome completo"
                  className="min-h-14 text-base placeholder:text-base bg-zinc-100 border-2 border-zinc-300"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem className="w-full">
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input
              value={userEmail}
              readOnly
              className="min-h-14 text-base placeholder:text-base bg-zinc-100 border-2 border-zinc-300"
            />
          </FormControl>
        </FormItem>

        <FormField
          control={form.control}
          name="whatsapp"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>WhatsApp</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value}
                  onChange={e => field.onChange(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="min-h-14 text-base placeholder:text-base bg-zinc-100 border-2 border-zinc-300"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full min-h-14">
          Próximo →
        </Button>
      </form>
    </Form>
  )
}
