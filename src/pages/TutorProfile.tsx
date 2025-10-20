import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Star, MapPin, BookOpen, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AvailabilityCalendar } from '@/components/availability/AvailabilityCalendar';
import { DayAvailability, loadAvailability } from '@/lib/availability';

interface TutorData {
  user_id: string;
  first_name: string;
  last_name: string;
  bio: string;
  subjects: string[];
  hourly_rate: number;
  experience_years: number;
  education: string;
  location: string;
  profile_image_url: string;
  is_verified: boolean;
  qualifications: string[];
}

interface Material {
  id: string;
  title: string;
  subject: string;
  price: number;
  description: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  student_id: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

export const TutorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isStudent } = useAuth();
  
  const [tutor, setTutor] = useState<TutorData | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchTutorData();
    }
  }, [id]);

  const fetchTutorData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Fetch tutor profile using public view (secure, limited fields)
      const { data: profileData, error: profileError } = await supabase
        .from('public_tutor_profiles')
        .select('*')
        .eq('user_id', id)
        .single();

      if (profileError) throw profileError;
      
      // Type assertion since view has slightly different shape
      setTutor({
        ...profileData,
        qualifications: [] // Not included in public view for security
      } as TutorData);

      // Fetch rating
      const { data: ratingData } = await supabase
        .rpc('get_tutor_average_rating', { tutor_user_id: id });
      setAvgRating(ratingData || 0);

      // Fetch materials
      const { data: materialsData } = await supabase
        .from('materials')
        .select('id, title, subject, price, description')
        .eq('tutor_id', id)
        .eq('approval_status', 'approved');
      setMaterials(materialsData || []);

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, profiles!reviews_student_id_fkey(first_name, last_name)')
        .eq('tutor_id', id)
        .order('created_at', { ascending: false })
        .limit(10);
      setReviews(reviewsData || []);

      // Fetch availability
      const avail = await loadAvailability(id);
      setAvailability(avail);
      
    } catch (error: any) {
      console.error('Error fetching tutor data:', error);
      toast({
        title: "Error",
        description: "Failed to load tutor profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookSession = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    navigate('/dashboard');
    toast({
      title: "Book a session",
      description: "Select a time slot from the tutor's availability"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-64 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Tutor Not Found</h1>
          <Button onClick={() => navigate('/tutors')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tutors
          </Button>
        </div>
      </div>
    );
  }

  const initials = `${tutor.first_name?.[0] || ''}${tutor.last_name?.[0] || ''}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/tutors')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tutors
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Card */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={tutor.profile_image_url} />
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl font-bold">
                      {tutor.first_name} {tutor.last_name}
                    </h1>
                    {tutor.is_verified && (
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    {tutor.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {tutor.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {avgRating.toFixed(1)} ({reviews.length} reviews)
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {tutor.experience_years} years experience
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {tutor.subjects?.map((subject) => (
                      <Badge key={subject} variant="secondary">{subject}</Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-primary">
                      ${tutor.hourly_rate}/hr
                    </span>
                    {isStudent && (
                      <Button onClick={handleBookSession}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Book Session
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="about" className="space-y-6">
            <TabsList>
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="materials">Materials ({materials.length})</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
            </TabsList>

            <TabsContent value="about">
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Bio</h3>
                    <p className="text-muted-foreground">{tutor.bio || 'No bio provided'}</p>
                  </div>
                  
                  {tutor.education && (
                    <div>
                      <h3 className="font-semibold mb-2">Education</h3>
                      <p className="text-muted-foreground">{tutor.education}</p>
                    </div>
                  )}
                  
                  {tutor.qualifications && tutor.qualifications.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Qualifications</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        {tutor.qualifications.map((qual, i) => (
                          <li key={i}>{qual}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="materials">
              <div className="grid gap-4 md:grid-cols-2">
                {materials.length === 0 ? (
                  <Card className="col-span-2">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No materials available
                    </CardContent>
                  </Card>
                ) : (
                  materials.map((material) => (
                    <Card key={material.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{material.title}</CardTitle>
                        <Badge variant="outline">{material.subject}</Badge>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {material.description || 'No description'}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-primary">
                            ${material.price}
                          </span>
                          <Button asChild size="sm">
                            <Link to="/materials">View Material</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="reviews">
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No reviews yet
                    </CardContent>
                  </Card>
                ) : (
                  reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold">
                              {review.profiles.first_name} {review.profiles.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-muted-foreground">{review.comment}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="availability">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  {availability.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No availability set
                    </p>
                  ) : (
                    <AvailabilityCalendar availability={availability} readonly />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default TutorProfile;
