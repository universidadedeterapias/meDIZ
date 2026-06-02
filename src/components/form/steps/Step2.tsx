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
import { Slider } from '@/components/ui/slider'
import { useUserForm } from '@/hooks/use-form-data'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import OptionSelector from '../OptionSelector'
import { useTranslation } from '@/i18n/useTranslation'

export default function Step2() {
  const { form, nextStep, prevStep } = useUserForm()
  const { t } = useTranslation()

  const handleStep2Submit = async () => {
    const isValid = await form.trigger(['age', 'gender', 'profession'])
    if (isValid) nextStep()
  }

  return (
    <div>
      <div className="flex flex-col items-center justify-center w-full gap-4">
        <p className="text-indigo-600 text-2xl font-bold">
          {t('form.step2.title', 'Informações pessoais')}
        </p>
        <p className="text-zinc-600 font-light text-center">
          {t('form.step2.subtitle', 'Conte-nos um pouco mais sobre você')}
        </p>
      </div>
      <Form {...form}>
        <form
          onSubmit={e => {
            e.preventDefault()
            handleStep2Submit()
          }}
          className="space-y-4 w-full mt-8 flex flex-col items-center text-zinc-600 pb-20"
        >
          {/* Idade */}
          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem className="w-full p">
                <FormLabel className="text-base">
                  {`${t('form.step2.ageLabel', 'Idade')}: ${field.value} ${t('form.step2.ageUnit', 'anos')}`}
                </FormLabel>
                <FormControl>
                  <div className="w-full px-6 pt-4">
                    <Slider
                      min={18}
                      max={80}
                      step={1}
                      value={[field.value]}
                      onValueChange={value => field.onChange(value[0])}
                    />
                    <div className="flex justify-between text-base text-zinc-500 mt-1">
                      <span>18</span>
                      <span>80</span>
                    </div>
                  </div>
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
              <FormItem className="w-full">
                <FormLabel className="text-base">{t('form.step2.gender', 'Gênero')}</FormLabel>
                <FormControl>
                  <OptionSelector
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { label: t('form.step2.gender.male', 'Masculino'), value: 'MALE' },
                      { label: t('form.step2.gender.female', 'Feminino'), value: 'FEMALE' },
                      { label: t('form.step2.gender.nonBinary', 'Não-binário'), value: 'NON_BINARY' },
                      {
                        label: t('form.step2.gender.preferNot', 'Prefiro não informar'),
                        value: 'PREFER_NOT_TO_SAY'
                      }
                    ]}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Profissão */}
          <FormField
            control={form.control}
            name="profession"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel className="text-base">{t('form.step2.profession', 'Profissão')}</FormLabel>
                <FormControl>
                  <Input
                    className="min-h-14 text-base placeholder:text-base bg-zinc-50 border-2 border-zinc-300"
                    placeholder={t('form.step2.profession.placeholder', 'Ex: Desenvolvedor, Vendedor...')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Botões */}
          <div className="w-full flex justify-between fixed bottom-4 left-0 right-0 px-4">
            <Button
              className="w-1/3 min-h-14"
              type="button"
              variant="outline"
              onClick={prevStep}
            >
              <ArrowLeft /> {t('form.navigation.back', 'Voltar')}
            </Button>
            <Button className="w-1/3 min-h-14" type="submit">
              {t('form.navigation.next', 'Próximo')} <ArrowRight />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
