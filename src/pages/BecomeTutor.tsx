// src/pages/BecomeTutor.tsx
import React, { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, DollarSign, BookOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const BecomeTutor: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    bio: profile?.bio || '',
    education: profile?.education || '',
    experience_years: profile?.experience_years || 0,
    hourly_rate: profile?.hourly_rate || 0
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('is_approved', true)
      .order('name');
    setAvailableSubjects(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subjects.length === 0) {
      toast({ title: "Select at least one subject", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // Update profile with tutor role
      const { error } = await supabase
        .from('profiles')
        .update({
          roles: supabase.sql`array_append(roles, 'tutor')`,
          bio: formData.bio,
          education: formData.education,
          experience_years: formData.experience_years,
          hourly_rate: formData.hourly_rate,
          subject_ids: subjects.map(s => s)
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: "Welcome as a Tutor!",
        description: "Your tutor profile is now active."
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Failed to upgrade",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Become a Tutor</CardTitle>
                <p className="text-sm text-muted-foreground">Share your knowledge and earn money</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label>Bio *</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell students about yourself..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Hourly Rate (ZAR) *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min="0"
                      step="10"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Years of Experience *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Education *</Label>
                <Textarea
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  placeholder="Your educational background..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label>Subjects You Teach *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {availableSubjects.map(subject => (
                    <Badge
                      key={subject.id}
                      variant={subjects.includes(subject.id) ? "default" : "outline"}
                      className="cursor-pointer justify-center py-2"
                      onClick={() => {
                        setSubjects(prev => 
                          prev.includes(subject.id)
                            ? prev.filter(s => s !== subject.id)
                            : [...prev, subject.id]
                        );
                      }}
                    >
                      <BookOpen className="mr-1 h-3 w-3" />
                      {subject.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Setting up...' : 'Become a Tutor'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
