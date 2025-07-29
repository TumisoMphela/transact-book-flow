import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from './Calendar';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CreditCard, Clock, User, BookOpen } from 'lucide-react';

interface TutorProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  hourly_rate: number;
  subjects: string[];
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutor: TutorProfile;
}

export const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, tutor }) => {
  const { user } = useAuth();
  const [selectedTime, setSelectedTime] = useState<Date | undefined>();
  const [duration, setDuration] = useState(1);
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch tutor availability
  useEffect(() => {
    if (isOpen && tutor) {
      fetchAvailability();
    }
  }, [isOpen, tutor]);

  const fetchAvailability = async () => {
    try {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('tutor_id', tutor.user_id);

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast({
        title: "Error",
        description: "Failed to load tutor availability",
        variant: "destructive"
      });
    }
  };

  const calculateTotal = () => {
    return (tutor.hourly_rate * duration).toFixed(2);
  };

  const handleBooking = async () => {
    if (!user || !selectedTime || !subject) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          student_id: user.id,
          tutor_id: tutor.user_id,
          session_date: selectedTime.toISOString(),
          duration_hours: duration,
          subject,
          notes,
          total_amount: parseFloat(calculateTotal()),
          status: 'pending'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      toast({
        title: "Booking Created",
        description: "Proceeding to payment...",
      });

      // Create Stripe checkout session
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        'create-checkout',
        {
          body: { bookingId: booking.id }
        }
      );

      if (checkoutError) throw checkoutError;

      // Redirect to Stripe checkout
      if (checkoutData?.url) {
        window.open(checkoutData.url, '_blank');
        onClose();
      }

    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedTime(undefined);
    setDuration(1);
    setSubject('');
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Book Session with {tutor.first_name} {tutor.last_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tutor Info */}
          <div className="bg-gradient-primary p-4 rounded-lg text-education-foreground">
            <h3 className="font-semibold text-lg mb-2">Session Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="opacity-90">Hourly Rate:</span>
                <p className="font-semibold">${tutor.hourly_rate}/hour</p>
              </div>
              <div>
                <span className="opacity-90">Available Subjects:</span>
                <p className="font-semibold">{tutor.subjects?.join(', ') || 'General'}</p>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <Calendar
            tutorId={tutor.user_id}
            onTimeSelect={setSelectedTime}
            selectedTime={selectedTime}
            availability={availability}
          />

          {/* Booking Form */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="duration" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration (hours)
                </Label>
                <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subject" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Subject *
                </Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {tutor.subjects?.map((subj) => (
                      <SelectItem key={subj} value={subj}>{subj}</SelectItem>
                    )) || <SelectItem value="General">General</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any specific topics or goals for this session..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>

          {/* Summary & Payment */}
          {selectedTime && subject && (
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">Booking Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date & Time:</span>
                  <p className="font-medium">
                    {format(selectedTime, 'EEEE, MMMM do, yyyy')} at {format(selectedTime, 'h:mm a')}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <p className="font-medium">{duration} hour(s)</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Subject:</span>
                  <p className="font-medium">{subject}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Cost:</span>
                  <p className="font-semibold text-lg">${calculateTotal()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleBooking}
              disabled={!selectedTime || !subject || loading}
              className="flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              {loading ? 'Processing...' : `Pay $${calculateTotal()}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};