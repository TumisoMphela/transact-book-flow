import React, { useState, useEffect } from 'react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, addDays, setHours, setMinutes, startOfDay } from 'date-fns';
import { Clock, User } from 'lucide-react';

interface TimeSlot {
  time: string;
  available: boolean;
  dayOfWeek: number;
}

interface CalendarProps {
  tutorId: string;
  onTimeSelect: (datetime: Date) => void;
  selectedTime?: Date;
  availability?: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }>;
}

export const Calendar: React.FC<CalendarProps> = ({
  tutorId,
  onTimeSelect,
  selectedTime,
  availability = []
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Generate time slots based on availability
  useEffect(() => {
    if (!selectedDate || !availability.length) {
      setTimeSlots([]);
      return;
    }

    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = availability.find(av => av.day_of_week === dayOfWeek && av.is_available);

    if (!dayAvailability) {
      setTimeSlots([]);
      return;
    }

    const slots: TimeSlot[] = [];
    const startTime = dayAvailability.start_time;
    const endTime = dayAvailability.end_time;

    // Parse start and end times
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    // Generate hourly slots
    for (let hour = startHour; hour < endHour; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      slots.push({
        time: timeStr,
        available: true,
        dayOfWeek
      });
    }

    setTimeSlots(slots);
  }, [selectedDate, availability]);

  const handleTimeSlotClick = (timeSlot: TimeSlot) => {
    if (!selectedDate || !timeSlot.available) return;

    const [hour, minute] = timeSlot.time.split(':').map(Number);
    const datetime = setMinutes(setHours(startOfDay(selectedDate), hour), minute);
    onTimeSelect(datetime);
  };

  const isTimeSlotSelected = (timeSlot: TimeSlot) => {
    if (!selectedTime || !selectedDate) return false;
    const [hour] = timeSlot.time.split(':').map(Number);
    return selectedTime.getDate() === selectedDate.getDate() &&
           selectedTime.getHours() === hour;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Select Date & Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar */}
            <div>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                className={cn("rounded-md border p-3 pointer-events-auto")}
              />
            </div>

            {/* Time Slots */}
            <div>
              <h3 className="font-semibold mb-3">Available Times</h3>
              {selectedDate ? (
                timeSlots.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={isTimeSlotSelected(slot) ? "default" : "outline"}
                        size="sm"
                        disabled={!slot.available}
                        onClick={() => handleTimeSlotClick(slot)}
                        className="justify-center"
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No available times for this date</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Select a date to see available times</p>
                </div>
              )}
            </div>
          </div>

          {selectedTime && (
            <div className="mt-4 p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium">
                Selected: {format(selectedTime, 'EEEE, MMMM do, yyyy')} at {format(selectedTime, 'h:mm a')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};