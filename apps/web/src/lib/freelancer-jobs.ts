import freelancerJobsData from '@/data/freelancer-jobs.json'

export interface FreelancerJob {
  slug: string
  nameEn: string
  nameTh: string
}

export interface FreelancerJobsCatalog {
  updatedAt: string
  jobs: FreelancerJob[]
}

export const freelancerJobsCatalog = freelancerJobsData as FreelancerJobsCatalog

export const freelancerJobs = freelancerJobsCatalog.jobs

export function getFreelancerJobBySlug(slug: string): FreelancerJob | undefined {
  return freelancerJobs.find((job) => job.slug === slug)
}
