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
        className="space-y-4 max-w-md mx-auto mt-8"
      >
        {userImage && (
          <Image
            src={userImage}
            alt="User"
            width={80}
            height={80}
            className="rounded-full"
          />
        )}

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome completo</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input value={userEmail} readOnly />
          </FormControl>
        </FormItem>

        <FormField
          control={form.control}
          name="whatsapp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Próximo →
        </Button>
      </form>
    </Form>
  )
}
