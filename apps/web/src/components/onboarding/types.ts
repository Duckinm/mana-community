export type OnboardingData = {
  freelancerType: string
  freelancerTypeOther: string
  hourlyRate: string
  currency: string
  revenueGoal: string
  activeProjects: string
  painPoints: string[]
  painPointOther: string
  heardFrom: string
}

export type StepProps = {
  data: OnboardingData
  onChange: (patch: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}
