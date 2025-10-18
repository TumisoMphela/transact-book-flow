import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, Users, BookOpen, DollarSign } from 'lucide-react';

interface RevenueData {
  day: string;
  revenue: number;
}

interface BookingData {
  day: string;
  bookings: number;
}

interface TopTutor {
  user_id: string;
  first_name: string;
  last_name: string;
  revenue: number;
  sessions: number;
}

interface TopMaterial {
  id: string;
  title: string;
  subject: string;
  sales: number;
}

interface KPIData {
  totalRevenue: number;
  totalBookings: number;
  topTutor: string;
  topMaterial: string;
}

export const AnalyticsCharts: React.FC = () => {
  const [dateRange, setDateRange] = useState<string>('30');
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [bookingData, setBookingData] = useState<BookingData[]>([]);
  const [topTutors, setTopTutors] = useState<TopTutor[]>([]);
  const [topMaterials, setTopMaterials] = useState<TopMaterial[]>([]);
  const [kpis, setKpis] = useState<KPIData>({
    totalRevenue: 0,
    totalBookings: 0,
    topTutor: '-',
    topMaterial: '-'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const days = parseInt(dateRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      // Fetch revenue data
      const { data: revData, error: revError } = await supabase
        .from('v_revenue_daily')
        .select('*')
        .gte('day', cutoff.toISOString().split('T')[0])
        .order('day', { ascending: true });

      if (revError) throw revError;
      setRevenueData(
        (revData || []).map(r => ({
          day: new Date(r.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: parseFloat(r.revenue?.toString() || '0')
        }))
      );

      // Fetch booking data
      const { data: bookData, error: bookError } = await supabase
        .from('v_bookings_daily')
        .select('*')
        .gte('day', cutoff.toISOString().split('T')[0])
        .order('day', { ascending: true });

      if (bookError) throw bookError;
      setBookingData(
        (bookData || []).map(b => ({
          day: new Date(b.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          bookings: b.bookings || 0
        }))
      );

      // Fetch top tutors
      const { data: tutorData, error: tutorError } = await supabase
        .from('v_top_tutors')
        .select('*')
        .limit(5);

      if (tutorError) throw tutorError;
      setTopTutors(tutorData || []);

      // Fetch top materials
      const { data: matData, error: matError } = await supabase
        .from('v_top_materials')
        .select('*')
        .limit(5);

      if (matError) throw matError;
      setTopMaterials(matData || []);

      // Calculate KPIs
      const totalRev = (revData || []).reduce((sum, r) => sum + (parseFloat(r.revenue?.toString() || '0')), 0);
      const totalBook = (bookData || []).reduce((sum, b) => sum + (Number(b.bookings) || 0), 0);
      const topT = tutorData?.[0] ? `${tutorData[0].first_name} ${tutorData[0].last_name}` : '-';
      const topM = matData?.[0]?.title || '-';

      setKpis({
        totalRevenue: totalRev,
        totalBookings: totalBook,
        topTutor: topT,
        topMaterial: topM
      });

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex justify-end">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${kpis.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Tutor</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold truncate">{kpis.topTutor}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Material</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold truncate">{kpis.topMaterial}</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="Revenue ($)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bookings Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Bookings Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bookingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="bookings" fill="hsl(var(--primary))" name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Tutors & Materials */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Tutors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topTutors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
              ) : (
                topTutors.map((tutor, i) => (
                  <div key={tutor.user_id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {i + 1}. {tutor.first_name} {tutor.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tutor.sessions} sessions
                      </p>
                    </div>
                    <span className="font-bold text-primary">
                      ${parseFloat(tutor.revenue.toString()).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topMaterials.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
              ) : (
                topMaterials.map((material, i) => (
                  <div key={material.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {i + 1}. {material.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {material.subject}
                      </p>
                    </div>
                    <span className="font-bold text-primary">
                      {material.sales} sales
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
