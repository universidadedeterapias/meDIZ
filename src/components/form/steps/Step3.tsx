'use client'

import CardSelector from '@/components/form/CardSelector'
import OptionSelector from '@/components/form/OptionSelector'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { useUserForm } from '@/hooks/use-form-data'
import { ArrowLeft, ArrowRight, Briefcase, Home } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'

export default function Step3() {
  const { form, nextStep, prevStep } = useUserForm()
  const { t } = useTranslation()
  const appUsage = form.watch('appUsage')

  const handleStep3Submit = async () => {
    const isValid = await form.trigger([
      'appUsage',
      'educationOrSpecialty',
      'yearsOfExperience',
      'clientsPerWeek',
      'averageSessionPrice'
    ])
    if (isValid) nextStep()
  }

  return (
    <div>
      <div className="flex flex-col items-center justify-center w-full gap-4">
        <p className="text-indigo-600 text-2xl font-bold">
          {t('form.step3.title', 'Como você usará o meDIZ!')}
        </p>
        <p className="text-zinc-600 font-light text-center">
          {t('form.step3.subtitle', 'Selecione a opção que melhor se aplica a você')}
        </p>
      </div>
      <Form {...form}>
        <form
          onSubmit={e => {
            e.preventDefault()
            handleStep3Submit()
          }}
          className="space-y-6 w-full mt-8 pb-20"
        >
          {/* Uso do App */}
          <FormField
            control={form.control}
            name="appUsage"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">
                  {t('form.step3.appUsage', 'Como pretende usar o app?')}
                </FormLabel>
                <FormControl>
                  <CardSelector
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      {
                        label: t('form.step3.appUsage.personal', 'Uso Pessoal'),
                        value: 'PERSONAL',
                        description: t(
                          'form.step3.appUsage.personal.description',
                          'Para uso próprio e da família'
                        ),
                        icon: <Home size={32} />
                      },
                      {
                        label: t('form.step3.appUsage.professional', 'Uso Profissional'),
                        value: 'PROFESSIONAL',
                        description: t(
                          'form.step3.appUsage.professional.description',
                          'Para uso em consultório ou clínica'
                        ),
                        icon: <Briefcase size={32} />
                      }
                    ]}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campos adicionais - Só se for profissional */}
          <Collapsible open={appUsage === 'PROFESSIONAL'}>
            <CollapsibleContent className="space-y-6 mt-4 border-t pt-4">
              {/* Formação / Especialidade */}
              <FormField
                control={form.control}
                name="educationOrSpecialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('form.step3.education', 'Formação / Especialidade')}
                    </FormLabel>
                    <FormControl>
                      <OptionSelector
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        options={[
                          { label: t('form.step3.education.psychologist', 'Psicólogo'), value: 'PSYCHOLOGIST' },
                          { label: t('form.step3.education.doctor', 'Médico'), value: 'DOCTOR' },
                          { label: t('form.step3.education.therapist', 'Terapeuta'), value: 'THERAPIST' },
                          { label: t('form.step3.education.coach', 'Coach'), value: 'COACH' },
                          { label: t('form.step3.education.other', 'Outro'), value: 'OTHER' }
                        ]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tempo de atuação */}
              <FormField
                control={form.control}
                name="yearsOfExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.step3.experience', 'Tempo de atuação profissional')}</FormLabel>
                    <FormControl>
                      <OptionSelector
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        options={[
                          { label: t('form.step3.experience.lessThan1', 'Menos de 1 ano'), value: 'LESS_THAN_1' },
                          { label: t('form.step3.experience.between1and3', '1-3 anos'), value: 'BETWEEN_1_AND_3' },
                          { label: t('form.step3.experience.between4and7', '4-7 anos'), value: 'BETWEEN_4_AND_7' },
                          { label: t('form.step3.experience.between8and15', '8-15 anos'), value: 'BETWEEN_8_AND_15' },
                          { label: t('form.step3.experience.moreThan15', 'Mais de 15 anos'), value: 'MORE_THAN_15' }
                        ]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Clientes por semana */}
              <FormField
                control={form.control}
                name="clientsPerWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.step3.clients', 'Quantos clientes atende por semana?')}</FormLabel>
                    <FormControl>
                      <OptionSelector
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        options={[
                          { label: t('form.step3.clients.upTo5', 'Até 5'), value: 'UP_TO_5' },
                          { label: t('form.step3.clients.between6and10', '6-10'), value: 'BETWEEN_6_AND_10' },
                          { label: t('form.step3.clients.between11and20', '11-20'), value: 'BETWEEN_11_AND_20' },
                          { label: t('form.step3.clients.between21and30', '21-30'), value: 'BETWEEN_21_AND_30' },
                          { label: t('form.step3.clients.moreThan30', 'Mais de 30'), value: 'MORE_THAN_30' }
                        ]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Valor médio por atendimento */}
              <FormField
                control={form.control}
                name="averageSessionPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.step3.price', 'Valor médio por atendimento')}</FormLabel>
                    <FormControl>
                      <OptionSelector
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        options={[
                          { label: t('form.step3.price.upTo100', 'Até R$100'), value: 'UP_TO_100' },
                          { label: t('form.step3.price.between101and200', 'R$101-200'), value: 'BETWEEN_101_AND_200' },
                          { label: t('form.step3.price.between201and300', 'R$201-300'), value: 'BETWEEN_201_AND_300' },
                          { label: t('form.step3.price.between301and500', 'R$301-500'), value: 'BETWEEN_301_AND_500' },
                          { label: t('form.step3.price.moreThan500', 'Acima de R$500'), value: 'MORE_THAN_500' }
                        ]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Botões */}
          <div className="flex justify-between fixed bottom-0 left-0 right-0 p-4 bg-zinc-100">
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
