import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Users, FileText, Calendar, DollarSign, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface TutorProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  bio: string;
  subjects: string[];
  experience_years: number;
  hourly_rate: number;
  is_verified: boolean;
  profile_image_url?: string;
  education: string;
  created_at: string;
}

interface Material {
  id: string;
  title: string;
  subject: string;
  price: number;
  is_approved: boolean;
  download_count: number;
  file_size_mb: number;
  file_url: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface BookingStats {
  total_bookings: number;
  pending_bookings: number;
  completed_bookings: number;
  total_revenue: number;
}

export const AdminDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stats, setStats] = useState<BookingStats>({
    total_bookings: 0,
    pending_bookings: 0,
    completed_bookings: 0,
    total_revenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile?.user_type === 'admin') {
      fetchData();
    }
  }, [user, profile]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchTutors(),
        fetchMaterials(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTutors(data || []);
    } catch (error) {
      console.error('Error fetching tutors:', error);
    }
  };

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select(`
          *,
          profiles!materials_tutor_id_fkey (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch booking statistics
      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      const { count: pendingBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: completedBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Calculate total revenue
      const { data: revenueData } = await supabase
        .from('bookings')
        .select('total_amount')
        .eq('status', 'completed');

      const totalRevenue = revenueData?.reduce((sum, booking) => sum + (booking.total_amount || 0), 0) || 0;

      setStats({
        total_bookings: totalBookings || 0,
        pending_bookings: pendingBookings || 0,
        completed_bookings: completedBookings || 0,
        total_revenue: totalRevenue
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const verifyTutor = async (tutorId: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: verified })
        .eq('user_id', tutorId);

      if (error) throw error;

      toast({
        title: verified ? "Tutor verified" : "Tutor unverified",
        description: `Tutor has been ${verified ? 'verified' : 'unverified'} successfully`
      });

      fetchTutors();
    } catch (error) {
      console.error('Error updating tutor verification:', error);
      toast({
        title: "Error",
        description: "Failed to update tutor verification",
        variant: "destructive"
      });
    }
  };

  const approveMaterial = async (materialId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('materials')
        .update({ is_approved: approved })
        .eq('id', materialId);

      if (error) throw error;

      toast({
        title: approved ? "Material approved" : "Material rejected",
        description: `Material has been ${approved ? 'approved' : 'rejected'} successfully`
      });

      fetchMaterials();
    } catch (error) {
      console.error('Error updating material approval:', error);
      toast({
        title: "Error",
        description: "Failed to update material approval",
        variant: "destructive"
      });
    }
  };

  // Check if user is admin
  if (!profile || profile.user_type !== 'admin') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">You don't have permission to access the admin dashboard.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading admin dashboard...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{stats.total_bookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Verified Tutors</p>
                <p className="text-2xl font-bold">
                  {tutors.filter(t => t.is_verified).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Materials</p>
                <p className="text-2xl font-bold">{materials.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${stats.total_revenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tutors" className="space-y-4">
            <TabsList>
              <TabsTrigger value="tutors">Tutor Verification</TabsTrigger>
              <TabsTrigger value="materials">Material Approval</TabsTrigger>
            </TabsList>

            <TabsContent value="tutors">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tutor</TableHead>
                    <TableHead>Subjects</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tutors.map((tutor) => (
                    <TableRow key={tutor.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={tutor.profile_image_url} />
                            <AvatarFallback>
                              {tutor.first_name?.[0]}{tutor.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{tutor.first_name} {tutor.last_name}</p>
                            <p className="text-sm text-muted-foreground">{tutor.education}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tutor.subjects?.slice(0, 2).map((subject, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                          {tutor.subjects?.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{tutor.subjects.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{tutor.experience_years} years</TableCell>
                      <TableCell>${tutor.hourly_rate}/hr</TableCell>
                      <TableCell>
                        <Badge variant={tutor.is_verified ? "default" : "secondary"}>
                          {tutor.is_verified ? "Verified" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!tutor.is_verified && (
                            <Button
                              size="sm"
                              onClick={() => verifyTutor(tutor.user_id, true)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verify
                            </Button>
                          )}
                          {tutor.is_verified && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => verifyTutor(tutor.user_id, false)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Unverify
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="materials">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{material.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {material.file_size_mb.toFixed(1)} MB
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{material.subject}</Badge>
                      </TableCell>
                      <TableCell>
                        {material.profiles.first_name} {material.profiles.last_name}
                      </TableCell>
                      <TableCell>
                        {material.price > 0 ? `$${material.price.toFixed(2)}` : 'Free'}
                      </TableCell>
                      <TableCell>{material.download_count}</TableCell>
                      <TableCell>
                        <Badge variant={material.is_approved ? "default" : "secondary"}>
                          {material.is_approved ? "Approved" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!material.is_approved && (
                            <Button
                              size="sm"
                              onClick={() => approveMaterial(material.id, true)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(material.file_url, '_blank')}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {material.is_approved && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveMaterial(material.id, false)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};