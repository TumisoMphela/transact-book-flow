import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, User, Mail, MapPin, BookOpen, Award } from 'lucide-react';

export const Profile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    phone: '',
    location: '',
    hourly_rate: '',
    experience_years: '',
    education: '',
    subjects: [] as string[],
    subject_interests: [] as string[],
    qualifications: [] as string[]
  });

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
    'History', 'Geography', 'Computer Science', 'Economics', 'Art',
    'Psychology', 'Sociology', 'Philosophy', 'Languages', 'Music'
  ];

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        bio: profile.bio || '',
        phone: profile.phone || '',
        location: profile.location || '',
        hourly_rate: profile.hourly_rate?.toString() || '',
        experience_years: profile.experience_years?.toString() || '',
        education: profile.education || '',
        subjects: profile.subjects || [],
        subject_interests: profile.subject_interests || [],
        qualifications: profile.qualifications || []
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubjectToggle = (subject: string, field: 'subjects' | 'subject_interests') => {
    const currentSubjects = formData[field];
    const isSelected = currentSubjects.includes(subject);
    
    if (isSelected) {
      handleInputChange(field, currentSubjects.filter(s => s !== subject));
    } else {
      handleInputChange(field, [...currentSubjects, subject]);
    }
  };

  const handleQualificationAdd = () => {
    if (formData.qualifications.length < 10) {
      handleInputChange('qualifications', [...formData.qualifications, '']);
    }
  };

  const handleQualificationChange = (index: number, value: string) => {
    const newQualifications = [...formData.qualifications];
    newQualifications[index] = value;
    handleInputChange('qualifications', newQualifications);
  };

  const handleQualificationRemove = (index: number) => {
    const newQualifications = formData.qualifications.filter((_, i) => i !== index);
    handleInputChange('qualifications', newQualifications);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        bio: formData.bio,
        phone: formData.phone,
        location: formData.location,
        education: formData.education,
        subjects: formData.subjects,
        subject_interests: formData.subject_interests,
        qualifications: formData.qualifications.filter(q => q.trim() !== ''),
        ...(profile?.user_type === 'tutor' && {
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
        })
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user?.id);

      if (error) throw error;

      await refreshProfile();
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isEmailVerified = profile?.email_confirmed_at !== null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Verification Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Email Verification</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
            <Badge variant={isEmailVerified ? "default" : "secondary"} className="flex items-center gap-1">
              {isEmailVerified ? (
                <>
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" />
                  Unverified
                </>
              )}
            </Badge>
          </div>
          
          {profile?.user_type === 'tutor' && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 mt-3">
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Tutor Verification</p>
                  <p className="text-sm text-muted-foreground">Professional verification status</p>
                </div>
              </div>
              <Badge variant={profile?.is_verified ? "default" : "secondary"} className="flex items-center gap-1">
                {profile?.is_verified ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3" />
                    Pending
                  </>
                )}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="City, Country"
                />
              </div>
            </div>

            {/* Tutor-specific fields */}
            {profile?.user_type === 'tutor' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => handleInputChange('hourly_rate', e.target.value)}
                      placeholder="50.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="experience_years">Years of Experience</Label>
                    <Input
                      id="experience_years"
                      type="number"
                      min="0"
                      value={formData.experience_years}
                      onChange={(e) => handleInputChange('experience_years', e.target.value)}
                      placeholder="5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="education">Education</Label>
                  <Textarea
                    id="education"
                    value={formData.education}
                    onChange={(e) => handleInputChange('education', e.target.value)}
                    placeholder="Your educational background..."
                    rows={2}
                  />
                </div>

                {/* Subjects */}
                <div>
                  <Label>Subjects You Teach</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {subjects.map((subject) => (
                      <Badge
                        key={subject}
                        variant={formData.subjects.includes(subject) ? "default" : "outline"}
                        className="cursor-pointer justify-center py-2"
                        onClick={() => handleSubjectToggle(subject, 'subjects')}
                      >
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Qualifications */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Qualifications & Certifications</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleQualificationAdd}
                    >
                      Add Qualification
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.qualifications.map((qualification, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={qualification}
                          onChange={(e) => handleQualificationChange(index, e.target.value)}
                          placeholder="e.g., Master's in Mathematics, TEFL Certified"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleQualificationRemove(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Student-specific fields */}
            {profile?.user_type === 'student' && (
              <div>
                <Label>Subjects of Interest</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {subjects.map((subject) => (
                    <Badge
                      key={subject}
                      variant={formData.subject_interests.includes(subject) ? "default" : "outline"}
                      className="cursor-pointer justify-center py-2"
                      onClick={() => handleSubjectToggle(subject, 'subject_interests')}
                    >
                      {subject}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};