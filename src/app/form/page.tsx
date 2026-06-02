'use client'

import Step1 from '@/components/form/steps/Step1'
import Step2 from '@/components/form/steps/Step2'
import Step3 from '@/components/form/steps/Step3'
import Step4 from '@/components/form/steps/Step4'
import Stepper from '@/components/form/steps/Stepper'
import SuccessStep from '@/components/form/steps/SuccessStep'
import { UserFormProvider, useUserForm } from '@/hooks/use-form-data'

export default function FormPage() {
  return (
    <UserFormProvider>
      <div
        className="relative flex min-h-screen w-full flex-col items-center justify-start gap-6 bg-muted font-[family-name:var(--font-geist-sans)] sm:gap-10"
      >
        <div className="flex h-auto w-full items-center justify-center border-b border-border bg-background px-3 py-3 shadow-sm sm:py-4">
          <p className="text-primary text-2xl font-bold sm:text-3xl">
            me
            <span className="text-yellow-400 uppercase">diz!</span>
          </p>
        </div>
        <div className="w-full max-w-xl px-3 pb-8 sm:px-4 sm:pb-10">
          <Stepper />
          <FormStepsRenderer />
        </div>
      </div>
    </UserFormProvider>
  )
}

function FormStepsRenderer() {
  const { step } = useUserForm()

  switch (step) {
    case 1:
      return <Step1 />
    case 2:
      return <Step2 />
    case 3:
      return <Step3 />
    case 4:
      return <Step4 />
    case 5:
      return <SuccessStep />
    default:
      return null
  }
}
