import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Demo {
  id: string;
  tutor_id: string;
  title: string;
  description: string;
  video_url: string | null;
  video_file_path: string | null;
  approval_status: string;
  is_approved: boolean;
  created_at: string;
}

export default function AdminDemos() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [demos, setDemos] = useState<Demo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchDemos();
  }, [isAdmin]);

  const fetchDemos = async () => {
    const { data, error } = await supabase
      .from('tutor_demos')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDemos(data);
    }
    setLoading(false);
  };

  const handleApprove = async (id: string, approve: boolean) => {
    try {
      const { error } = await supabase.rpc('admin_approve_demo', {
        _id: id,
        _approve: approve,
      });

      if (error) throw error;

      toast({
        title: approve ? 'Demo Approved' : 'Demo Rejected',
        description: `The demo has been ${approve ? 'approved' : 'rejected'} successfully`,
      });

      fetchDemos();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Manage Demo Videos</h1>

      <div className="grid gap-4">
        {demos.map((demo) => (
          <Card key={demo.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{demo.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{demo.description}</p>
                </div>
                <Badge
                  variant={
                    demo.approval_status === 'approved'
                      ? 'default'
                      : demo.approval_status === 'rejected'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {demo.approval_status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demo.video_url && (
                  <div className="aspect-video">
                    {demo.video_url.includes('youtube.com') || demo.video_url.includes('youtu.be') ? (
                      <iframe
                        src={demo.video_url.replace('watch?v=', 'embed/')}
                        className="w-full h-full rounded"
                        allowFullScreen
                      />
                    ) : (
                      <video src={demo.video_url} controls className="w-full h-full rounded" />
                    )}
                  </div>
                )}

                {demo.approval_status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(demo.id, true)}
                      className="flex-1"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleApprove(demo.id, false)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  Submitted: {new Date(demo.created_at).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        {demos.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No demo videos to review
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
