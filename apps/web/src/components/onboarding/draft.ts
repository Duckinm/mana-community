import { client, expectEden } from '@/lib/eden'
import { getFreelancerJobBySlug } from '@/lib/freelancer-jobs'
import type { OnboardingData } from './types'

// Wizard answers must survive the OAuth full-page redirect, so they live in localStorage
const DRAFT_KEY = 'onboarding-draft'

export function loadOnboardingDraft(): Partial<OnboardingData> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as Partial<OnboardingData>) : null
  } catch {
    return null
  }
}

export function saveOnboardingDraft(data: OnboardingData) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
}

export function clearOnboardingDraft() {
  localStorage.removeItem(DRAFT_KEY)
}

export function resolveFreelancerTypeLabel(data: Partial<OnboardingData>): string | null {
  if (!data.freelancerType) return null
  if (data.freelancerType === 'other') return data.freelancerTypeOther?.trim() || 'Other'
  return getFreelancerJobBySlug(data.freelancerType)?.nameEn ?? data.freelancerType
}

export function serializePainPoints(data: Partial<OnboardingData>): string | null {
  const values = (data.painPoints ?? [])
    .map((value) => value === 'other' ? data.painPointOther?.trim() : value)
    .filter((value): value is string => Boolean(value))
  return values.length ? values.join(',') : null
}

export async function saveOnboardingProfile(data: Partial<OnboardingData>, name?: string) {
  expectEden(
    await client.api.users.me.patch({
      name: name || undefined,
      freelancerType: resolveFreelancerTypeLabel(data),
      hourlyRate: data.hourlyRate || null,
      currency: data.currency || null,
      revenueGoal: data.revenueGoal || null,
      activeProjects: data.activeProjects || null,
      painPoint: serializePainPoints(data),
      heardFrom: data.heardFrom || null,
      onboardedAt: new Date().toISOString(),
    }),
  )
}

export async function completeProfileForAiCredit(data: OnboardingData) {
  return expectEden(
    await client.api.users.me["complete-profile"].post({
      freelancerType: resolveFreelancerTypeLabel(data) ?? "",
      hourlyRate: data.hourlyRate || null,
      currency: data.currency || null,
      revenueGoal: data.revenueGoal || null,
      activeProjects: data.activeProjects || null,
      painPoint: serializePainPoints(data),
      heardFrom: data.heardFrom || null,
    }),
  )
}
