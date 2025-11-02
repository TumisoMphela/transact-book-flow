import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Award, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  duration_hours: number;
  lesson_count?: number;
  progress?: number;
}

export default function Academy() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, [user]);

  const fetchCourses = async () => {
    try {
      const { data: coursesData, error } = await supabase
        .from('tutor_courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch lesson counts and progress
      const coursesWithDetails = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { count } = await supabase
            .from('course_lessons')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          let progress = 0;
          if (user) {
            const { data: progressData } = await supabase
              .from('course_progress')
              .select('*')
              .eq('user_id', user.id)
              .eq('course_id', course.id)
              .eq('completed', true);

            progress = count ? ((progressData?.length || 0) / count) * 100 : 0;
          }

          return {
            ...course,
            lesson_count: count || 0,
            progress,
          };
        })
      );

      setCourses(coursesWithDetails);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-500';
      case 'intermediate':
        return 'bg-yellow-500';
      case 'advanced':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">OutLook Tutor Academy</h1>
        <p className="text-muted-foreground">
          Become a certified tutor through our comprehensive training program
        </p>
      </div>

      {/* Hero Section */}
      <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Get Certified</h3>
                <p className="text-sm text-muted-foreground">
                  Earn badges & certificates
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Grow Your Skills</h3>
                <p className="text-sm text-muted-foreground">
                  From beginner to expert
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Learn at Your Pace</h3>
                <p className="text-sm text-muted-foreground">
                  Self-paced courses
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Courses Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <Badge className={getDifficultyColor(course.difficulty)}>
                  {course.difficulty}
                </Badge>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  {course.duration_hours}h
                </div>
              </div>
              <CardTitle className="text-xl">{course.title}</CardTitle>
              <CardDescription>{course.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {course.lesson_count} lessons
                  </span>
                  {course.progress > 0 && (
                    <span className="font-medium">{Math.round(course.progress)}% complete</span>
                  )}
                </div>
                {course.progress > 0 && (
                  <Progress value={course.progress} className="h-2" />
                )}
                <Button
                  className="w-full"
                  onClick={() => navigate(`/academy/${course.id}`)}
                >
                  {course.progress > 0 ? 'Continue' : 'Start Course'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {courses.length === 0 && (
        <Card className="p-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No courses available yet</h3>
          <p className="text-muted-foreground">
            Check back soon for new training courses
          </p>
        </Card>
      )}
    </div>
  );
}