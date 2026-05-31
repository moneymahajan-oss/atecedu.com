import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in .env.local'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for all tables
export interface Certificate {
  id: string
  certificate_no: string
  batch_id: string | null
  student_name: string
  father_name: string
  mother_name: string | null
  course_name: string
  course_duration: string | null
  grade: string | null
  marks_obtained: number | null
  total_marks: number | null
  issue_date: string | null
  center_name: string
  is_active: boolean
  created_at: string
}

export interface Course {
  id: string
  title: string
  slug: string
  description: string | null
  short_description: string | null
  thumbnail_url: string | null
  duration_weeks: number | null
  mode: 'online' | 'hybrid' | 'offline'
  fee_inr: number | null
  original_fee_inr: number | null
  is_active: boolean
  is_featured: boolean
  category: string | null
  syllabus: { week: number; topic: string; subtopics: string[] }[] | null
  what_you_learn: string[] | null
  prerequisites: string | null
  certificate_offered: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Enquiry {
  id?: string
  name: string
  phone: string
  email?: string
  course_interest?: string
  message?: string
}

export interface Testimonial {
  id: string
  student_name: string
  course: string | null
  company_placed: string | null
  review: string | null
  rating: number | null
  photo_url: string | null
  is_active: boolean
}
