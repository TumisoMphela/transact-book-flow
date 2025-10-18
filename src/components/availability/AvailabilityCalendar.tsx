import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DayAvailability, getDayName } from '@/lib/availability';
import { Clock } from 'lucide-react';

interface AvailabilityCalendarProps {
  availability: DayAvailability[];
  readonly?: boolean;
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  availability,
  readonly = true
}) => {
  const renderDay = (day: number) => {
    const dayData = availability.find(d => d.day === day);
    const slots = dayData?.slots || [];

    return (
      <Card key={day}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{getDayName(day)}</CardTitle>
        </CardHeader>
        <CardContent>
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Unavailable</p>
          ) : (
            <div className="space-y-2">
              {slots.map((slot, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{slot.start} - {slot.end}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5, 6].map(renderDay)}
    </div>
  );
};
