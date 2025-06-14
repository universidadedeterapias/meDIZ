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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useUserForm } from '@/hooks/use-form-data'

export default function Step3() {
  const { form, nextStep, prevStep } = useUserForm()

  const handleStep3Submit = async () => {
    const isValid = await form.trigger(['appUsage'])
    if (isValid) nextStep()
  }

  return (
    <Form {...form}>
      <form
        onSubmit={e => {
          e.preventDefault()
          handleStep3Submit()
        }}
        className="space-y-4 max-w-md mx-auto mt-8"
      >
        {/* Uso do App */}
        <FormField
          control={form.control}
          name="appUsage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Como pretende usar o app?</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma opção" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PERSONAL">Pessoal</SelectItem>
                  <SelectItem value="PROFESSIONAL">Profissional</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botões */}
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={prevStep}>
            ← Voltar
          </Button>
          <Button type="submit">Próximo →</Button>
        </div>
      </form>
    </Form>
  )
}
