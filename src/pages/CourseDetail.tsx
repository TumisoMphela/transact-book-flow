import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Play, Clock, BookOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  order_index: number;
  completed?: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  duration_hours: number;
}

export default function CourseDetail() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId, user]);

  const fetchCourseDetails = async () => {
    try {
      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('tutor_courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (lessonsError) throw lessonsError;

      // Check completion status for each lesson
      if (user) {
        const { data: progressData } = await supabase
          .from('course_progress')
          .select('lesson_id, completed')
          .eq('user_id', user.id)
          .eq('course_id', courseId);

        const completedLessons = new Set(
          progressData?.filter((p) => p.completed).map((p) => p.lesson_id) || []
        );

        const lessonsWithProgress = lessonsData.map((lesson) => ({
          ...lesson,
          completed: completedLessons.has(lesson.id),
        }));

        setLessons(lessonsWithProgress);

        // Calculate progress
        const completedCount = lessonsWithProgress.filter((l) => l.completed).length;
        setProgress((completedCount / lessonsData.length) * 100);
      } else {
        setLessons(lessonsData);
      }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">Course not found</h3>
          <Button onClick={() => navigate('/academy')}>Back to Academy</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => navigate('/academy')} className="mb-4">
        ← Back to Academy
      </Button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Course Info */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <Badge className="w-fit mb-2">{course.difficulty}</Badge>
              <CardTitle>{course.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{course.description}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {course.duration_hours} hours
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                {lessons.length} lessons
              </div>
              {user && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Your Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lessons List */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-4">Course Content</h2>
          <div className="space-y-4">
            {lessons.map((lesson, index) => (
              <Card
                key={lesson.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/academy/lesson/${lesson.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {lesson.completed ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">
                            {index + 1}. {lesson.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {lesson.description}
                          </p>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {lesson.duration_minutes} min
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}