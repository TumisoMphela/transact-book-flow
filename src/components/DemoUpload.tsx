// src/components/DemoUpload.tsx
import React, { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, Youtube, Upload, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const DemoUpload: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadType, setUploadType] = useState<'upload' | 'youtube'>('upload');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    video_url: '',
    video_file: null as File | null
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
    setSubjects(data || []);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 200 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 200MB", variant: "destructive" });
        return;
      }
      if (!file.type.startsWith('video/')) {
        toast({ title: "Invalid file", description: "Please select a video", variant: "destructive" });
        return;
      }
      setFormData({ ...formData, video_file: file });
    }
  };

  const uploadVideo = async () => {
    if (!formData.video_file) return null;

    const fileExt = formData.video_file.name.split('.').pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('tutor-demos')
      .upload(fileName, formData.video_file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('tutor-demos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.subject_id) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      let videoUrl = formData.video_url;
      
      if (uploadType === 'upload') {
        if (!formData.video_file) {
          toast({ title: "Select a video file", variant: "destructive" });
          return;
        }
        videoUrl = await uploadVideo();
      }

      const { error } = await supabase
        .from('tutor_demos')
        .insert({
          tutor_id: user?.id,
          title: formData.title,
          description: formData.description,
          subject_id: formData.subject_id,
          video_url: videoUrl,
          video_type: uploadType
        });

      if (error) throw error;

      toast({ title: "Demo uploaded", description: "Pending admin approval" });
      setFormData({ title: '', description: '', subject_id: '', video_url: '', video_file: null });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Upload Demo Video
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Video Type</Label>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant={uploadType === 'upload' ? 'default' : 'outline'}
                onClick={() => setUploadType('upload')}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload File
              </Button>
              <Button
                type="button"
                variant={uploadType === 'youtube' ? 'default' : 'outline'}
                onClick={() => setUploadType('youtube')}
              >
                <Youtube className="mr-2 h-4 w-4" />
                YouTube Link
              </Button>
            </div>
          </div>

          {uploadType === 'upload' ? (
            <div>
              <Label>Video File (Max 200MB)</Label>
              <Input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                required
              />
              {formData.video_file && (
                <p className="text-sm text-muted-foreground mt-1">
                  {formData.video_file.name} ({(formData.video_file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          ) : (
            <div>
              <Label>YouTube URL</Label>
              <Input
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
                required
              />
            </div>
          )}

          <div>
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Introduction to Calculus"
              required
            />
          </div>

          <div>
            <Label>Subject *</Label>
            <Select value={formData.subject_id} onValueChange={(v) => setFormData({ ...formData, subject_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What will students learn from this demo?"
              rows={3}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Submit for Approval'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
