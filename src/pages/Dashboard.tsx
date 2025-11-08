import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookingModal } from '@/components/BookingModal';
import { MessagingSystem } from '@/components/MessagingSystem';
import { MaterialLibrary } from '@/components/MaterialLibrary';
import { MaterialUpload } from '@/components/MaterialUpload';
import { AdminDashboard } from '@/components/AdminDashboard';
import { Profile } from '@/components/Profile';
import { toast } from '@/hooks/use-toast';
import { safeError, logError } from '@/lib/safeError';
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
  MessageSquare,
  FileText,
  Upload,
  Settings,
  MapPin,
  CheckCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';

interface Tutor {
  user_id: string;
  first_name: string;
  last_name: string;
  bio: string;
  hourly_rate: number;
  subjects: string[];
  experience_years: number;
  location?: string;
  is_verified: boolean;
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
  const [selectedMessageUserId, setSelectedMessageUserId] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [rateFilter, setRateFilter] = useState('any');
  const [locationFilter, setLocationFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
    'History', 'Geography', 'Computer Science', 'Economics', 'Art'
  ];

  useEffect(() => {
    if (user && profile) {
      fetchData();
    }
  }, [user, profile]);

  // Real-time updates for bookings (student side)
  useRealtimeUpdates({
    tableName: 'bookings',
    filter: user?.id ? `student_id=eq.${user.id}` : undefined,
    onInsert: (payload) => {
      console.log('New booking (student):', payload);
      fetchBookings();
      toast({
        title: "New Booking Created",
        description: "Your booking has been confirmed!",
      });
    },
    onUpdate: (payload) => {
      console.log('Booking updated (student):', payload);
      fetchBookings();
      const status = payload.new?.status;
      if (status === 'confirmed') {
        toast({
          title: "Booking Confirmed",
          description: "Your tutor has confirmed the session!",
        });
      } else if (status === 'cancelled') {
        toast({
          title: "Booking Cancelled",
          description: "Your booking has been cancelled.",
          variant: "destructive",
        });
      }
    }
  });

  // Real-time updates for bookings (tutor side)
  useRealtimeUpdates({
    tableName: 'bookings',
    filter: user?.id ? `tutor_id=eq.${user.id}` : undefined,
    onInsert: (payload) => {
      console.log('New booking (tutor):', payload);
      fetchBookings();
      toast({
        title: "New Booking Request",
        description: "You have a new booking request from a student!",
      });
    },
    onUpdate: (payload) => {
      console.log('Booking updated (tutor):', payload);
      fetchBookings();
      const status = payload.new?.status;
      if (status === 'cancelled') {
        toast({
          title: "Booking Cancelled",
          description: "A student cancelled their booking.",
          variant: "destructive",
        });
      }
    }
  });

  // Real-time updates for messages (as sender)
  useRealtimeUpdates({
    tableName: 'messages',
    filter: user?.id ? `sender_id=eq.${user.id}` : undefined,
    onInsert: (payload) => {
      console.log('New message sent:', payload);
    }
  });

  // Real-time updates for messages (as receiver)
  useRealtimeUpdates({
    tableName: 'messages',
    filter: user?.id ? `receiver_id=eq.${user.id}` : undefined,
    onInsert: (payload) => {
      console.log('New message received:', payload);
      toast({
        title: "New Message",
        description: "You have received a new message!",
      });
    }
  });

  // Real-time updates for materials
  useRealtimeUpdates({
    tableName: 'materials',
    onUpdate: (payload) => {
      console.log('Material updated:', payload);
      // Could refresh materials if needed
    }
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchTutors(), fetchBookings()]);
    } catch (error) {
      logError(error, 'Dashboard.fetchData');
      toast({
        title: "Error",
        description: safeError(error),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTutors = async () => {
    try {
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
    } catch (error) {
      logError(error, 'Dashboard.fetchTutors');
      throw error;
    }
  };

  const fetchBookings = async () => {
    try {
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
    } catch (error) {
      logError(error, 'Dashboard.fetchBookings');
      throw error;
    }
  };

  const filteredTutors = tutors.filter(tutor => {
    const matchesSearch = `${tutor.first_name} ${tutor.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tutor.subjects?.some(subject => subject.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSubject = !selectedSubject || selectedSubject === 'all' || tutor.subjects?.includes(selectedSubject);
    
    const matchesRate = !rateFilter || rateFilter === 'any' ||
                       (rateFilter === 'low' && tutor.hourly_rate <= 30) ||
                       (rateFilter === 'medium' && tutor.hourly_rate > 30 && tutor.hourly_rate <= 60) ||
                       (rateFilter === 'high' && tutor.hourly_rate > 60);
    
    const matchesLocation = !locationFilter || 
                           tutor.location?.toLowerCase().includes(locationFilter.toLowerCase());

    return matchesSearch && matchesSubject && matchesRate && matchesLocation;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'completed': return 'bg-primary text-primary-foreground';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const startConversation = (userId: string) => {
    setSelectedMessageUserId(userId);
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
              <h1 className="text-xl font-bold">OUTLOOK Tutoring</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {profile?.first_name}!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="capitalize">
              {profile?.user_type}
              {profile?.is_verified && profile?.user_type === 'tutor' && (
                <CheckCircle className="h-3 w-3 ml-1 text-green-500" />
              )}
            </Badge>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue={profile?.user_type === 'tutor' ? 'my-bookings' : 'find-tutors'} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-7">
            {profile?.user_type === 'student' && (
              <TabsTrigger value="find-tutors" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Find Tutors
              </TabsTrigger>
            )}
            <TabsTrigger value="my-bookings" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Materials
            </TabsTrigger>
            {profile?.user_type === 'tutor' && (
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
            )}
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            {profile?.user_type === 'admin' && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          {/* Find Tutors Tab - Enhanced Search */}
          {profile?.user_type === 'student' && (
            <TabsContent value="find-tutors" className="space-y-6">
              {/* Enhanced Search Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Search & Filter Tutors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or subject..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All subjects</SelectItem>
                        {subjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={rateFilter} onValueChange={setRateFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Hourly rate" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any rate</SelectItem>
                        <SelectItem value="low">$0-30/hr</SelectItem>
                        <SelectItem value="medium">$30-60/hr</SelectItem>
                        <SelectItem value="high">$60+/hr</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="Location"
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedSubject('all');
                      setRateFilter('any');
                      setLocationFilter('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredTutors.map((tutor) => (
                  <Card key={tutor.user_id} className="hover:shadow-elevated transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {tutor.first_name} {tutor.last_name}
                            {tutor.is_verified && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
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
                          {tutor.location && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{tutor.location}</span>
                            </div>
                          )}
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

                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          onClick={() => setSelectedTutor(tutor)}
                        >
                          Book Session
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => startConversation(tutor.user_id)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Message
                        </Button>
                      </div>
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

          {/* Messages Tab */}
          <TabsContent value="messages">
            <MessagingSystem 
              selectedUserId={selectedMessageUserId}
              onClose={() => setSelectedMessageUserId(undefined)}
            />
          </TabsContent>

          {/* Materials Tab */}
          <TabsContent value="materials">
            <MaterialLibrary />
          </TabsContent>

          {/* Material Upload Tab (Tutors only) */}
          {profile?.user_type === 'tutor' && (
            <TabsContent value="upload">
              <MaterialUpload onUploadSuccess={() => {
                toast({
                  title: "Material uploaded",
                  description: "Your material has been uploaded successfully and is pending approval"
                });
              }} />
            </TabsContent>
          )}

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Profile />
          </TabsContent>

          {/* Admin Dashboard */}
          {profile?.user_type === 'admin' && (
            <TabsContent value="admin">
              <AdminDashboard />
            </TabsContent>
          )}
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