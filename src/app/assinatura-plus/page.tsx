'use client'

import { Upsell } from '@/components/upsell'
import { useLanguage } from '@/i18n/useLanguage'
import { getUpgradeLink } from '@/lib/upgradeLinks'

export default function Subscribe() {
  const { language } = useLanguage()
  
  const handleSubscribe = () => {
    const upgradeLink = getUpgradeLink(language)
    window.open(upgradeLink, '_blank')
  }
  
  return <Upsell onClose={() => {}} onSubscribe={handleSubscribe} />
}
