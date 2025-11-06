import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import DOMPurify from 'dompurify';

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  content: string;
  video_url: string | null;
  order_index: number;
}

interface Quiz {
  id: string;
  question: string;
  options: any; // Json type from database
  correct_answer: string;
  explanation: string;
}

export default function LessonPage() {
  const { lessonId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sanitize lesson content to prevent XSS attacks
  const sanitizedContent = useMemo(() => {
    if (!lesson?.content) return '';
    return DOMPurify.sanitize(lesson.content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'img'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class'],
      ALLOW_DATA_ATTR: false,
    });
  }, [lesson?.content]);

  useEffect(() => {
    if (lessonId && user) {
      fetchLesson();
      fetchQuizzes();
      checkCompletion();
    }
  }, [lessonId, user]);

  const fetchLesson = async () => {
    try {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (error) throw error;
      setLesson(data);
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

  const fetchQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('lesson_quizzes')
        .select('*')
        .eq('lesson_id', lessonId);

      if (error) throw error;
      
      // Parse options if they're JSON
      const parsedQuizzes = (data || []).map(quiz => ({
        ...quiz,
        options: Array.isArray(quiz.options) ? quiz.options : JSON.parse(quiz.options as string)
      }));
      
      setQuizzes(parsedQuizzes);
    } catch (error: any) {
      console.error('Error fetching quizzes:', error);
    }
  };

  const checkCompletion = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('course_progress')
        .select('completed')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      setCompleted(data?.completed || false);
    } catch (error: any) {
      console.error('Error checking completion:', error);
    }
  };

  const handleSubmitQuiz = () => {
    let correctCount = 0;
    quizzes.forEach((quiz) => {
      if (answers[quiz.id] === quiz.correct_answer) {
        correctCount++;
      }
    });

    const percentage = (correctCount / quizzes.length) * 100;
    setScore(percentage);
    setShowResults(true);

    if (percentage >= 70) {
      markAsComplete(percentage);
    }
  };

  const markAsComplete = async (quizScore: number) => {
    if (!user || !lesson) return;

    try {
      const { error } = await supabase.from('course_progress').upsert({
        user_id: user.id,
        course_id: lesson.course_id,
        lesson_id: lesson.id,
        completed: true,
        quiz_score: Math.round(quizScore),
        completed_at: new Date().toISOString(),
      });

      if (error) throw error;

      setCompleted(true);
      toast({
        title: 'Lesson Completed!',
        description: `You scored ${Math.round(quizScore)}%`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">Lesson not found</h3>
          <Button onClick={() => navigate('/academy')}>Back to Academy</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate(`/academy/${lesson.course_id}`)}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Course
      </Button>

      <div className="max-w-4xl mx-auto">
        {/* Lesson Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-3xl">{lesson.title}</CardTitle>
              {completed && (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              )}
            </div>
            <p className="text-muted-foreground mt-2">{lesson.description}</p>
          </CardHeader>
        </Card>

        {/* Video */}
        {lesson.video_url && (
          <Card className="mb-8">
            <CardContent className="p-0">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <iframe
                  src={lesson.video_url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Lesson Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />
          </CardContent>
        </Card>

        {/* Quizzes */}
        {quizzes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Quiz</CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete the quiz to mark this lesson as complete (70% required)
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {quizzes.map((quiz, index) => (
                <div key={quiz.id} className="space-y-3">
                  <h3 className="font-semibold">
                    {index + 1}. {quiz.question}
                  </h3>
                  <RadioGroup
                    value={answers[quiz.id]}
                    onValueChange={(value) =>
                      setAnswers({ ...answers, [quiz.id]: value })
                    }
                    disabled={showResults}
                  >
                    {quiz.options.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${quiz.id}-${option}`} />
                        <Label
                          htmlFor={`${quiz.id}-${option}`}
                          className={`cursor-pointer ${
                            showResults
                              ? option === quiz.correct_answer
                                ? 'text-green-600 font-semibold'
                                : answers[quiz.id] === option
                                ? 'text-red-600'
                                : ''
                              : ''
                          }`}
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {showResults && (
                    <p className="text-sm text-muted-foreground italic">
                      {quiz.explanation}
                    </p>
                  )}
                </div>
              ))}

              {!showResults ? (
                <Button
                  onClick={handleSubmitQuiz}
                  disabled={Object.keys(answers).length !== quizzes.length}
                  className="w-full"
                >
                  Submit Quiz
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Your Score:</span>
                    <span className="text-2xl font-bold">{Math.round(score)}%</span>
                  </div>
                  <Progress value={score} className="h-2" />
                  {score >= 70 ? (
                    <p className="text-green-600 font-semibold">
                      ✓ Passed! Lesson marked as complete.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-red-600 font-semibold">
                        Need 70% to pass. Please try again.
                      </p>
                      <Button
                        onClick={() => {
                          setShowResults(false);
                          setAnswers({});
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Retry Quiz
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}