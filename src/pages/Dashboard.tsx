import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookingModal } from '@/components/BookingModal';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  Star, 
  User, 
  BookOpen, 
  Search,
  Filter,
  MessageSquare
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Tutor {
  user_id: string;
  first_name: string;
  last_name: string;
  bio: string;
  hourly_rate: number;
  subjects: string[];
  experience_years: number;
  profile_image_url?: string;
  average_rating?: number;
  review_count?: number;
}

interface Booking {
  id: string;
  session_date: string;
  duration_hours: number;
  subject: string;
  status: string;
  total_amount: number;
  tutor: {
    first_name: string;
    last_name: string;
  };
  student: {
    first_name: string;
    last_name: string;
  };
}

export const Dashboard = () => {
  const { user, profile, signOut } = useAuth();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile) {
      fetchData();
    }
  }, [user, profile]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchTutors(), fetchBookings()]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTutors = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_type', 'tutor')
      .not('hourly_rate', 'is', null);

    if (error) throw error;
    
    // Fetch ratings for each tutor
    const tutorsWithRatings = await Promise.all(
      (data || []).map(async (tutor) => {
        const { data: avgRating } = await supabase.rpc('get_tutor_average_rating', { tutor_user_id: tutor.user_id });
        const { data: reviewCount } = await supabase.rpc('get_tutor_review_count', { tutor_user_id: tutor.user_id });
        
        return {
          ...tutor,
          average_rating: avgRating || 0,
          review_count: reviewCount || 0
        };
      })
    );
    
    setTutors(tutorsWithRatings);
  };

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        tutor:profiles!tutor_id(first_name, last_name),
        student:profiles!student_id(first_name, last_name)
      `)
      .or(`student_id.eq.${user.id},tutor_id.eq.${user.id}`)
      .order('session_date', { ascending: false });

    if (error) throw error;
    setBookings(data || []);
  };

  const filteredTutors = tutors.filter(tutor =>
    `${tutor.first_name} ${tutor.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tutor.subjects?.some(subject => subject.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-primary text-primary-foreground';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-education-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">TutorConnect</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {profile?.first_name}!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="capitalize">
              {profile?.user_type}
            </Badge>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue={profile?.user_type === 'tutor' ? 'my-bookings' : 'find-tutors'} className="space-y-6">
          <TabsList>
            {profile?.user_type === 'student' && (
              <TabsTrigger value="find-tutors" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Find Tutors
              </TabsTrigger>
            )}
            <TabsTrigger value="my-bookings" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              My Bookings
            </TabsTrigger>
          </TabsList>

          {/* Find Tutors Tab */}
          {profile?.user_type === 'student' && (
            <TabsContent value="find-tutors" className="space-y-6">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tutors by name or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredTutors.map((tutor) => (
                  <Card key={tutor.user_id} className="hover:shadow-elevated transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {tutor.first_name} {tutor.last_name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">
                                {tutor.average_rating?.toFixed(1) || 'New'}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                ({tutor.review_count || 0})
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            ${tutor.hourly_rate}
                          </div>
                          <div className="text-sm text-muted-foreground">per hour</div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {tutor.bio || 'Experienced tutor ready to help you succeed!'}
                      </p>
                      
                      <div>
                        <div className="text-sm font-medium mb-2">Subjects:</div>
                        <div className="flex flex-wrap gap-1">
                          {tutor.subjects?.slice(0, 3).map((subject) => (
                            <Badge key={subject} variant="secondary" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                          {tutor.subjects?.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{tutor.subjects.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {tutor.experience_years || 0}+ years
                        </div>
                      </div>

                      <Button 
                        className="w-full" 
                        onClick={() => setSelectedTutor(tutor)}
                      >
                        Book Session
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredTutors.length === 0 && (
                <div className="text-center py-12">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tutors found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search criteria
                  </p>
                </div>
              )}
            </TabsContent>
          )}

          {/* My Bookings Tab */}
          <TabsContent value="my-bookings" className="space-y-6">
            <div className="grid gap-4">
              {bookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{booking.subject}</h3>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(booking.session_date), 'EEEE, MMMM do, yyyy')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(booking.session_date), 'h:mm a')} ({booking.duration_hours}h)
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {profile?.user_type === 'student' 
                              ? `${booking.tutor.first_name} ${booking.tutor.last_name}`
                              : `${booking.student.first_name} ${booking.student.last_name}`
                            }
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold">${booking.total_amount}</div>
                        <div className="text-sm text-muted-foreground">
                          {booking.duration_hours} hour{booking.duration_hours !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {bookings.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
                <p className="text-muted-foreground">
                  {profile?.user_type === 'student' 
                    ? 'Book your first tutoring session to get started!'
                    : 'Students will appear here when they book sessions with you.'
                  }
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Modal */}
      {selectedTutor && (
        <BookingModal
          isOpen={!!selectedTutor}
          onClose={() => setSelectedTutor(null)}
          tutor={selectedTutor}
        />
      )}
    </div>
  );
};