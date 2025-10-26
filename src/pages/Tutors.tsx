import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Star, 
  Clock, 
  MapPin, 
  CheckCircle, 
  MessageSquare,
  GraduationCap,
  Search,
  Filter
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

export const Tutors = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [rateFilter, setRateFilter] = useState('any');
  const [loading, setLoading] = useState(true);

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
    'History', 'Geography', 'Computer Science', 'Economics', 'Art'
  ];

  useEffect(() => {
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    try {
      setLoading(true);
      // Use public_tutor_profiles view for secure, limited data access
      const { data, error } = await supabase
        .from('public_tutor_profiles')
        .select('*')
        .not('hourly_rate', 'is', null);

      if (error) throw error;
      
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
      console.error('Error fetching tutors:', error);
      toast({
        title: "Error",
        description: "Failed to load tutors",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

    return matchesSearch && matchesSubject && matchesRate;
  });

  const handleBookTutor = (tutor: Tutor) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to book a session",
      });
      navigate('/auth');
      return;
    }
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading tutors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold">OUTLOOK Tutoring</h1>
          </div>
          <nav className="flex gap-4">
            <Button variant="ghost" onClick={() => navigate('/materials')}>Materials</Button>
            {user ? (
              <Button onClick={() => navigate('/dashboard')}>Dashboard</Button>
            ) : (
              <Button onClick={() => navigate('/auth')}>Login</Button>
            )}
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Find Your Perfect Tutor</h1>
          <p className="text-muted-foreground">Browse our expert tutors and book your first session</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <SelectValue placeholder="All subjects" />
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
                  <SelectValue placeholder="Any rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any rate</SelectItem>
                  <SelectItem value="low">$0-30/hr</SelectItem>
                  <SelectItem value="medium">$30-60/hr</SelectItem>
                  <SelectItem value="high">$60+/hr</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tutors Grid */}
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

                <Button 
                  className="w-full"
                  onClick={() => handleBookTutor(tutor)}
                >
                  Book Session
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTutors.length === 0 && (
          <div className="text-center py-20">
            <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tutors found</h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your search criteria
            </p>
            <Button onClick={() => {
              setSearchTerm('');
              setSelectedSubject('all');
              setRateFilter('any');
            }}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
