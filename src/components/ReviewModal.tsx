import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  comment: z.string().trim().min(10, 'Review must be at least 10 characters').max(500, 'Review must be less than 500 characters'),
});

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  tutorId: string;
  tutorName: string;
  onReviewSubmitted?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  tutorId,
  tutorName,
  onReviewSubmitted,
}) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ rating?: string; comment?: string }>({});

  const handleSubmit = async () => {
    if (!user) return;

    try {
      // Validate input
      const validatedData = reviewSchema.parse({ rating, comment });
      setErrors({});
      setLoading(true);

      // Check if review already exists
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('tutor_id', tutorId)
        .eq('student_id', user.id)
        .single();

      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from('reviews')
          .update({
            rating: validatedData.rating,
            comment: validatedData.comment,
          })
          .eq('id', existingReview.id);

        if (error) throw error;

        toast({
          title: 'Review Updated',
          description: 'Your review has been updated successfully.',
        });
      } else {
        // Create new review
        const { error } = await supabase
          .from('reviews')
          .insert({
            tutor_id: tutorId,
            student_id: user.id,
            rating: validatedData.rating,
            comment: validatedData.comment,
          });

        if (error) throw error;

        toast({
          title: 'Review Submitted',
          description: 'Thank you for your feedback!',
        });

        // Create notification for tutor
        await supabase.from('notifications').insert({
          user_id: tutorId,
          type: 'review',
          title: 'New Review Received',
          message: `You received a ${validatedData.rating}-star review!`,
          link: `/tutor-profile/${tutorId}`,
        });
      }

      onReviewSubmitted?.();
      handleClose();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { rating?: string; comment?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as 'rating' | 'comment'] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error('Error submitting review:', error);
        toast({
          title: 'Error',
          description: 'Failed to submit review. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setHoverRating(0);
    setComment('');
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rate Your Session with {tutorName}</DialogTitle>
          <DialogDescription>
            Share your experience to help other students
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Rating *</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
            {errors.rating && (
              <p className="text-sm text-destructive">{errors.rating}</p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Your Review *</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share details about your experience..."
              rows={5}
              maxLength={500}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{comment.length}/500 characters</span>
              {errors.comment && (
                <span className="text-destructive">{errors.comment}</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading || rating === 0}>
              {loading ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
