'use client'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { useUserForm } from '@/hooks/use-form-data'
import { ArrowLeft, Check } from 'lucide-react'
import { useState } from 'react'

export default function Step4() {
  const { form, prevStep, handleFinalSubmit } = useUserForm()
  const [charCount, setCharCount] = useState(0)

  const handleChange = (value: string) => {
    form.setValue('description', value)
    setCharCount(value.length)
  }

  return (
    <div>
      <div className="flex flex-col items-center justify-center w-full gap-4">
        <p className="text-indigo-600 text-2xl font-bold text-center">
          Como o meDIZ! pode ajudar você?
        </p>
        <p className="text-zinc-600 font-light text-center">
          Conte-nos como você acredita que entender a origem emocional pode
          beneficiar sua vida
        </p>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFinalSubmit)}
          className="space-y-6 w-full mt-8 flex flex-col items-center text-zinc-600 pb-20"
        >
          {/* Descrição */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel className="text-base">
                  Descreva como você espera que o meDIZ! possa ajudar você a
                  entender melhor suas emoções:
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Compartilhe suas expectativas, desafios emocionais que gostaria de resolver, ou como você acha que o autoconhecimento emocional pode transformar sua vida…"
                    className="min-h-32 text-base placeholder:text-base placeholder:text-zinc-500 bg-zinc-50 border-2 border-zinc-300"
                    maxLength={500}
                    value={field.value}
                    onChange={e => handleChange(e.target.value)}
                  />
                </FormControl>
                <div className="text-right text-sm text-zinc-500">
                  {charCount}/500 caracteres
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Botões */}
          <div className="flex justify-between fixed bottom-4 left-0 right-0 px-4">
            <Button
              className="w-1/3 min-h-14"
              type="button"
              variant="outline"
              onClick={prevStep}
            >
              <ArrowLeft /> Voltar
            </Button>
            <Button
              className="w-1/3 min-h-14 bg-green-500 text-white hover:bg-green-600"
              type="submit"
            >
              Enviar <Check />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
