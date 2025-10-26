import { supabase } from "@/integrations/supabase/client";

export interface TimeSlot {
  start: string; // HH:MM format
  end: string;
}

export interface DayAvailability {
  day: number; // 0=Sunday, 6=Saturday
  slots: TimeSlot[];
}

export interface AvailabilityRecord {
  id?: string;
  tutor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const getDayName = (day: number) => DAYS[day];

export const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

export const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const validateSlot = (start: string, end: string): string | null => {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  
  if (endMin <= startMin) {
    return "End time must be after start time";
  }
  
  if ((endMin - startMin) < 30) {
    return "Minimum slot duration is 30 minutes";
  }
  
  return null;
};

export const checkOverlap = (
  newSlot: TimeSlot,
  existingSlots: TimeSlot[]
): boolean => {
  const newStart = timeToMinutes(newSlot.start);
  const newEnd = timeToMinutes(newSlot.end);
  
  return existingSlots.some(slot => {
    const start = timeToMinutes(slot.start);
    const end = timeToMinutes(slot.end);
    return (newStart < end && newEnd > start);
  });
};

export const loadAvailability = async (tutorId: string): Promise<DayAvailability[]> => {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('tutor_id', tutorId)
    .eq('is_available', true)
    .order('day_of_week')
    .order('start_time');

  if (error) throw error;

  const byDay: { [key: number]: TimeSlot[] } = {};
  
  data?.forEach(record => {
    if (!byDay[record.day_of_week]) {
      byDay[record.day_of_week] = [];
    }
    byDay[record.day_of_week].push({
      start: record.start_time,
      end: record.end_time
    });
  });

  return Object.entries(byDay).map(([day, slots]) => ({
    day: parseInt(day),
    slots
  }));
};

export const saveAvailability = async (
  tutorId: string,
  availability: DayAvailability[]
): Promise<void> => {
  // Delete existing availability
  const { error: deleteError } = await supabase
    .from('availability')
    .delete()
    .eq('tutor_id', tutorId);

  if (deleteError) throw deleteError;

  // Insert new records
  const records: Omit<AvailabilityRecord, 'id'>[] = [];
  
  availability.forEach(day => {
    day.slots.forEach(slot => {
      records.push({
        tutor_id: tutorId,
        day_of_week: day.day,
        start_time: slot.start,
        end_time: slot.end,
        is_available: true
      });
    });
  });

  if (records.length > 0) {
    const { error: insertError } = await supabase
      .from('availability')
      .insert(records);

    if (insertError) throw insertError;
  }
};
