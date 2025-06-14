'use client'

import Step1 from '@/components/form/steps/Step1'
import Step2 from '@/components/form/steps/Step2'
import Step3 from '@/components/form/steps/Step3'
import Step4 from '@/components/form/steps/Step4'
import { UserFormProvider, useUserForm } from '@/hooks/use-form-data'

export default function FormPage() {
  return (
    <UserFormProvider>
      <FormStepsRenderer />
    </UserFormProvider>
  )
}

function FormStepsRenderer() {
  const { step } = useUserForm()
  console.log(step)

  switch (step) {
    case 1:
      return <Step1 />
    case 2:
      return <Step2 />
    case 3:
      return <Step3 />
    case 4:
      return <Step4 />
    default:
      return null
  }
}
