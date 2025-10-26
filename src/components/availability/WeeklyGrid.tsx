import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Copy, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  DayAvailability,
  TimeSlot,
  getDayName,
  generateTimeSlots,
  validateSlot,
  checkOverlap
} from '@/lib/availability';

interface WeeklyGridProps {
  availability: DayAvailability[];
  onChange: (availability: DayAvailability[]) => void;
}

export const WeeklyGrid: React.FC<WeeklyGridProps> = ({ availability, onChange }) => {
  const [localAvailability, setLocalAvailability] = useState<DayAvailability[]>(availability);
  const timeSlots = generateTimeSlots();

  useEffect(() => {
    setLocalAvailability(availability);
  }, [availability]);

  const handleAddSlot = (day: number) => {
    const dayData = localAvailability.find(d => d.day === day);
    const newSlot: TimeSlot = { start: '09:00', end: '10:00' };

    if (dayData) {
      if (checkOverlap(newSlot, dayData.slots)) {
        toast({
          title: "Overlap detected",
          description: "This slot overlaps with an existing one. Please adjust.",
          variant: "destructive"
        });
        return;
      }
      const updated = localAvailability.map(d =>
        d.day === day ? { ...d, slots: [...d.slots, newSlot] } : d
      );
      setLocalAvailability(updated);
      onChange(updated);
    } else {
      const updated = [...localAvailability, { day, slots: [newSlot] }];
      setLocalAvailability(updated);
      onChange(updated);
    }
  };

  const handleRemoveSlot = (day: number, slotIndex: number) => {
    const updated = localAvailability.map(d => {
      if (d.day === day) {
        return { ...d, slots: d.slots.filter((_, i) => i !== slotIndex) };
      }
      return d;
    }).filter(d => d.slots.length > 0);
    
    setLocalAvailability(updated);
    onChange(updated);
  };

  const handleSlotChange = (
    day: number,
    slotIndex: number,
    field: 'start' | 'end',
    value: string
  ) => {
    const updated = localAvailability.map(d => {
      if (d.day === day) {
        const newSlots = d.slots.map((slot, i) => {
          if (i === slotIndex) {
            const updatedSlot = { ...slot, [field]: value };
            const error = validateSlot(updatedSlot.start, updatedSlot.end);
            if (error) {
              toast({
                title: "Invalid time",
                description: error,
                variant: "destructive"
              });
              return slot;
            }
            const otherSlots = d.slots.filter((_, idx) => idx !== i);
            if (checkOverlap(updatedSlot, otherSlots)) {
              toast({
                title: "Overlap detected",
                description: "This slot overlaps with another.",
                variant: "destructive"
              });
              return slot;
            }
            return updatedSlot;
          }
          return slot;
        });
        return { ...d, slots: newSlots };
      }
      return d;
    });
    
    setLocalAvailability(updated);
    onChange(updated);
  };

  const handleCopyMonday = () => {
    const monday = localAvailability.find(d => d.day === 1);
    if (!monday || monday.slots.length === 0) {
      toast({
        title: "No Monday schedule",
        description: "Add Monday availability first to copy.",
        variant: "destructive"
      });
      return;
    }

    const updated: DayAvailability[] = [];
    for (let day = 0; day <= 6; day++) {
      if (day === 1) {
        updated.push(monday);
      } else {
        updated.push({ day, slots: [...monday.slots] });
      }
    }
    
    setLocalAvailability(updated);
    onChange(updated);
    toast({
      title: "Success",
      description: "Monday schedule copied to all days"
    });
  };

  const handleClearAll = () => {
    setLocalAvailability([]);
    onChange([]);
    toast({
      title: "Cleared",
      description: "All availability removed"
    });
  };

  const renderDay = (day: number) => {
    const dayData = localAvailability.find(d => d.day === day);
    const slots = dayData?.slots || [];

    return (
      <Card key={day} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{getDayName(day)}</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddSlot(day)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Slot
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No availability</p>
          ) : (
            <div className="space-y-2">
              {slots.map((slot, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={slot.start}
                    onValueChange={(value) => handleSlotChange(day, index, 'start', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <span>to</span>
                  
                  <Select
                    value={slot.end}
                    onValueChange={(value) => handleSlotChange(day, index, 'end', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveSlot(day, index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Button onClick={handleCopyMonday} variant="outline">
          <Copy className="h-4 w-4 mr-2" />
          Copy Monday to All
        </Button>
        <Button onClick={handleClearAll} variant="outline">
          <X className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3, 4, 5, 6].map(renderDay)}
      </div>
    </div>
  );
};
