-- Phase 1: Availability System
CREATE TABLE IF NOT EXISTS public.availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Availability: public read"
  ON public.availability FOR SELECT USING (TRUE);

CREATE POLICY "Availability: tutor manage own"
  ON public.availability FOR ALL
  USING (auth.uid() = tutor_id)
  WITH CHECK (auth.uid() = tutor_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_availability_tutor_day
  ON public.availability (tutor_id, day_of_week, start_time);

-- Helper to check overlap at booking time
CREATE OR REPLACE FUNCTION public.is_within_availability(
  _tutor uuid, _start timestamptz, _end timestamptz
) RETURNS boolean LANGUAGE sql STABLE AS $$
  WITH s AS (
    SELECT EXTRACT(DOW FROM _start AT TIME ZONE 'UTC')::int AS dow,
           (_start AT TIME ZONE 'UTC')::time AS st,
           (_end   AT TIME ZONE 'UTC')::time AS et
  )
  SELECT EXISTS (
    SELECT 1 FROM availability a, s
    WHERE a.tutor_id=_tutor AND a.is_available
      AND a.day_of_week = s.dow
      AND a.start_time <= s.st AND a.end_time >= s.et
  );
$$;

-- Enforce booking within availability + prevent overlap
CREATE OR REPLACE FUNCTION public.validate_booking()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  _end timestamptz;
BEGIN
  _end := NEW.session_date + (NEW.duration_hours || ' hours')::interval;

  IF NOT public.is_within_availability(NEW.tutor_id, NEW.session_date, _end) THEN
    RAISE EXCEPTION 'Requested slot is outside tutor availability';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.tutor_id = NEW.tutor_id
      AND b.status IN ('pending','confirmed')
      AND b.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND tstzrange(b.session_date, b.session_date + (b.duration_hours || ' hours')::interval, '[)') &&
          tstzrange(NEW.session_date, _end, '[)')
  ) THEN
    RAISE EXCEPTION 'Requested slot overlaps with an existing booking';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_booking ON public.bookings;
CREATE TRIGGER trg_validate_booking
  BEFORE INSERT OR UPDATE OF session_date, duration_hours, tutor_id, status
  ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status IN ('pending','confirmed'))
  EXECUTE FUNCTION public.validate_booking();

-- Phase 2: Analytics Views
CREATE OR REPLACE VIEW public.v_revenue_daily AS
SELECT date_trunc('day', created_at)::date AS day,
       COALESCE(SUM(amount_paid),0)::numeric(12,2) AS revenue
FROM public.payment_sessions
WHERE payment_status='paid'
GROUP BY 1 ORDER BY 1 DESC;

CREATE OR REPLACE VIEW public.v_bookings_daily AS
SELECT date_trunc('day', created_at)::date AS day,
       COUNT(*)::int AS bookings
FROM public.bookings
GROUP BY 1 ORDER BY 1 DESC;

CREATE OR REPLACE VIEW public.v_top_tutors AS
SELECT p.user_id, p.first_name, p.last_name,
       COALESCE(SUM(ps.amount_paid),0)::numeric(12,2) AS revenue,
       COUNT(DISTINCT b.id) AS sessions
FROM profiles p
LEFT JOIN bookings b ON b.tutor_id=p.user_id
LEFT JOIN payment_sessions ps ON ps.booking_id=b.id AND ps.payment_status='paid'
WHERE p.user_type='tutor'
GROUP BY 1,2,3
ORDER BY revenue DESC
LIMIT 10;

CREATE OR REPLACE VIEW public.v_top_materials AS
SELECT m.id, m.title, m.subject, COUNT(mp.id) AS sales
FROM materials m
LEFT JOIN material_purchases mp ON mp.material_id=m.id
WHERE m.approval_status='approved'
GROUP BY 1,2,3
ORDER BY sales DESC
LIMIT 10;