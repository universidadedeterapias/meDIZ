'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { createContext, useContext, useState } from 'react'
import { useForm, UseFormReturn } from 'react-hook-form'
import { z } from 'zod'

const formSchema = z
  .object({
    fullName: z.string().min(1, 'Nome obrigatório'),
    whatsapp: z.string().min(1, 'WhatsApp obrigatório'),
    age: z.coerce.number().min(1, 'Idade obrigatória'),
    gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY']),
    profession: z.string().min(1, 'Profissão obrigatória'),
    appUsage: z.enum(['PERSONAL', 'PROFESSIONAL']),
    description: z.string().min(1, 'Descrição obrigatória'),

    // Campos adicionais - Opcionais por padrão
    educationOrSpecialty: z.string().optional(),
    yearsOfExperience: z.string().optional(),
    clientsPerWeek: z.string().optional(),
    averageSessionPrice: z.string().optional()
  })
  .superRefine((data, ctx) => {
    // Se appUsage for PROFESSIONAL, validar os campos adicionais
    if (data.appUsage === 'PROFESSIONAL') {
      if (!data.educationOrSpecialty) {
        ctx.addIssue({
          path: ['educationOrSpecialty'],
          code: 'custom',
          message: 'Formação ou Especialidade obrigatória'
        })
      }

      if (data.yearsOfExperience == null) {
        ctx.addIssue({
          path: ['yearsOfExperience'],
          code: 'custom',
          message: 'Tempo de atuação obrigatório'
        })
      }

      if (data.clientsPerWeek == null) {
        ctx.addIssue({
          path: ['clientsPerWeek'],
          code: 'custom',
          message: 'Número de clientes por semana obrigatório'
        })
      }

      if (data.averageSessionPrice == null) {
        ctx.addIssue({
          path: ['averageSessionPrice'],
          code: 'custom',
          message: 'Valor médio por atendimento obrigatório'
        })
      }
    }
  })

export type UserFormData = z.infer<typeof formSchema>

interface FormContextType {
  step: number
  nextStep: () => void
  prevStep: () => void
  form: UseFormReturn<UserFormData>
  handleFinalSubmit: () => Promise<void>
}

const UserFormContext = createContext<FormContextType | null>(null)

export function UserFormProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState(1)

  const form = useForm<UserFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      whatsapp: '',
      age: 0,
      gender: 'MALE',
      profession: '',
      appUsage: 'PERSONAL',
      description: '',
      educationOrSpecialty: '',
      yearsOfExperience: '',
      clientsPerWeek: '',
      averageSessionPrice: ''
    }
  })

  const nextStep = () => setStep(prev => prev + 1)
  const prevStep = () => setStep(prev => prev - 1)

  const handleFinalSubmit = async () => {
    const isValid = await form.trigger()
    if (!isValid) return

    try {
      await fetch('/api/user/form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.getValues())
      })

      nextStep() // 👈 Vai para o Step 5 (Success)
    } catch (error) {
      console.error('Erro ao salvar formulário:', error)
      // Se quiser, pode adicionar um estado de erro aqui
    }
  }

  return (
    <UserFormContext.Provider
      value={{ step, nextStep, prevStep, form, handleFinalSubmit }}
    >
      {children}
    </UserFormContext.Provider>
  )
}

export function useUserForm() {
  const context = useContext(UserFormContext)
  if (!context)
    throw new Error('useUserForm deve ser usado dentro de UserFormProvider')
  return context
}
