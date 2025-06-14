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

export default function Step4() {
  const { form, prevStep, handleFinalSubmit } = useUserForm()

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFinalSubmit)}
        className="space-y-4 max-w-md mx-auto mt-8"
      >
        {/* Descrição */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conte um pouco sobre você</FormLabel>
              <FormControl>
                <Textarea placeholder="Digite aqui..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botões */}
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={prevStep}>
            ← Voltar
          </Button>
          <Button type="submit" className="bg-green-500 text-white">
            Enviar ✔
          </Button>
        </div>
      </form>
    </Form>
  )
}
