-- ─────────────────────────────────────────────────────────
-- ATEC atecedu.com — Supabase Database Setup
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────

-- 1. CERTIFICATES (migrated from old PHP/MySQL)
CREATE TABLE IF NOT EXISTS certificates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_no  TEXT UNIQUE NOT NULL,
  batch_id        TEXT,
  student_name    TEXT NOT NULL,
  father_name     TEXT NOT NULL,
  mother_name     TEXT,
  course_name     TEXT NOT NULL,
  course_duration TEXT,
  grade           TEXT,
  marks_obtained  INTEGER,
  total_marks     INTEGER,
  issue_date      DATE,
  center_name     TEXT DEFAULT 'ATEC Gurdaspur',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. COURSES
CREATE TABLE IF NOT EXISTS courses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  slug                TEXT UNIQUE NOT NULL,
  description         TEXT,
  short_description   TEXT,
  thumbnail_url       TEXT,
  duration_weeks      INTEGER,
  mode                TEXT CHECK (mode IN ('online', 'hybrid', 'offline')),
  fee_inr             INTEGER,
  original_fee_inr    INTEGER,
  is_active           BOOLEAN DEFAULT TRUE,
  is_featured         BOOLEAN DEFAULT FALSE,
  category            TEXT,
  syllabus            JSONB,
  what_you_learn      JSONB,
  prerequisites       TEXT,
  certificate_offered BOOLEAN DEFAULT TRUE,
  sort_order          INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENROLLMENTS
CREATE TABLE IF NOT EXISTS enrollments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID REFERENCES auth.users(id),
  course_id       UUID REFERENCES courses(id),
  enrolled_at     TIMESTAMPTZ DEFAULT NOW(),
  payment_status  TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_id      TEXT,
  amount_paid     INTEGER,
  progress_percent INTEGER DEFAULT 0,
  completed_at    TIMESTAMPTZ
);

-- 4. STUDENT PROFILES
CREATE TABLE IF NOT EXISTS student_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name  TEXT,
  father_name TEXT,
  phone      TEXT,
  city       TEXT,
  state      TEXT DEFAULT 'Punjab',
  photo_url  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ENQUIRIES
CREATE TABLE IF NOT EXISTS enquiries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  course_interest TEXT,
  message         TEXT,
  is_contacted    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TESTIMONIALS
CREATE TABLE IF NOT EXISTS testimonials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name  TEXT NOT NULL,
  course        TEXT,
  company_placed TEXT,
  review        TEXT,
  rating        INTEGER CHECK (rating BETWEEN 1 AND 5),
  photo_url     TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BLOG POSTS
CREATE TABLE IF NOT EXISTS blog_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  content      TEXT,
  excerpt      TEXT,
  thumbnail_url TEXT,
  author       TEXT DEFAULT 'ATEC Team',
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY — enable on every table
-- ─────────────────────────────────────────────────────────

ALTER TABLE certificates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials    ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts      ENABLE ROW LEVEL SECURITY;

-- Certificates: anyone can read active ones (employers verify without login)
CREATE POLICY "Public cert read" ON certificates
  FOR SELECT USING (is_active = TRUE);

-- Courses: anyone can read active courses
CREATE POLICY "Public course read" ON courses
  FOR SELECT USING (is_active = TRUE);

-- Enrollments: students see only their own
CREATE POLICY "Own enrollments" ON enrollments
  FOR ALL USING (student_id = auth.uid());

-- Student profiles: own data only
CREATE POLICY "Own profile" ON student_profiles
  FOR ALL USING (id = auth.uid());

-- Enquiries: anyone can submit (no read from client)
CREATE POLICY "Submit enquiry" ON enquiries
  FOR INSERT WITH CHECK (TRUE);

-- Testimonials: anyone can read active ones
CREATE POLICY "Public testimonial read" ON testimonials
  FOR SELECT USING (is_active = TRUE);

-- Blog posts: anyone can read published ones
CREATE POLICY "Public blog read" ON blog_posts
  FOR SELECT USING (is_published = TRUE);

-- ─────────────────────────────────────────────────────────
-- SAMPLE DATA — add a few courses to test the homepage
-- ─────────────────────────────────────────────────────────

INSERT INTO courses (title, slug, short_description, mode, fee_inr, original_fee_inr, duration_weeks, is_active, is_featured, category, sort_order)
VALUES
  ('Hardware & Networking', 'hardware-networking', 'A+ and CCNA certified training. Learn chip-level repair, network setup and troubleshooting.', 'hybrid', 12000, 18000, 24, true, true, 'Hardware', 1),
  ('Web Designing', 'web-designing', 'HTML, CSS, JavaScript, Photoshop. Build and launch professional websites.', 'hybrid', 8000, 12000, 12, true, true, 'Web', 2),
  ('Tally ERP 9 / Prime', 'tally', 'Learn Tally from the creators of Tally. GST, payroll, inventory and accounting.', 'online', 5000, 8000, 8, true, true, 'Accounting', 3),
  ('Linux Administrator', 'linux-administrator', 'Red Hat Linux server setup, administration and networking.', 'hybrid', 10000, 15000, 16, true, true, 'Networking', 4),
  ('Chip-Level Repair', 'chip-level-repair', 'India''s most advanced hardware repair course. Laptop and desktop motherboard repair.', 'offline', 15000, 20000, 20, true, true, 'Hardware', 5),
  ('Desktop Publishing', 'desktop-publishing', 'CorelDRAW, Photoshop, PageMaker. Design for print and digital media.', 'hybrid', 6000, 9000, 10, true, true, 'Design', 6)
ON CONFLICT (slug) DO NOTHING;
