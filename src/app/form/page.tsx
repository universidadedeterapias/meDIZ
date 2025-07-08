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
        className="flex flex-col justify-start items-center
                  min-w-screen min-h-screen gap-10
                  font-[family-name:var(--font-geist-sans)] bg-zinc-100"
      >
        <div className="w-full h-auto flex align-middle justify-center bg-zinc-50 shadow-sm py-4">
          <p className="text-primary font-bold text-3xl">
            me
            <span className="text-yellow-400 uppercase">diz!</span>
          </p>
        </div>
        <div className="max-w-xl w-full px-4">
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
