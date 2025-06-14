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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useUserForm } from '@/hooks/use-form-data'

export default function Step2() {
  const { form, nextStep, prevStep } = useUserForm()

  const handleStep2Submit = async () => {
    const isValid = await form.trigger(['age', 'gender', 'profession'])
    if (isValid) nextStep()
  }

  return (
    <Form {...form}>
      <form
        onSubmit={e => {
          e.preventDefault()
          handleStep2Submit()
        }}
        className="space-y-4 w-full mx-auto mt-8"
      >
        {/* Idade */}
        <FormField
          control={form.control}
          name="age"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Idade</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Sua idade" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Gênero */}
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gênero</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu gênero" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="MALE">Masculino</SelectItem>
                  <SelectItem value="FEMALE">Feminino</SelectItem>
                  <SelectItem value="NON_BINARY">Não-binário</SelectItem>
                  <SelectItem value="PREFER_NOT_TO_SAY">
                    Prefiro não informar
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Profissão */}
        <FormField
          control={form.control}
          name="profession"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profissão</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Desenvolvedor, Vendedor..."
                  {...field}
                />
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
          <Button type="submit">Próximo →</Button>
        </div>
      </form>
    </Form>
  )
}
