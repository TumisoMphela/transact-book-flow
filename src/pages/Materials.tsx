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
  FileText, 
  Download, 
  DollarSign,
  GraduationCap,
  Search,
  Filter,
  Star
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Material {
  id: string;
  title: string;
  description: string;
  subject: string;
  file_url: string;
  file_type: string;
  price: number;
  file_size_mb: number;
  download_count: number;
  tutor: {
    first_name: string;
    last_name: string;
  };
}

export const Materials = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
    'History', 'Geography', 'Computer Science', 'Economics', 'Art'
  ];

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('materials')
        .select(`
          *,
          tutor:profiles!tutor_id(first_name, last_name)
        `)
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast({
        title: "Error",
        description: "Failed to load materials",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSubject = !selectedSubject || material.subject === selectedSubject;
    
    const matchesPrice = !priceFilter || 
                        (priceFilter === 'free' && material.price === 0) ||
                        (priceFilter === 'paid' && material.price > 0);

    return matchesSearch && matchesSubject && matchesPrice;
  });

  const handleDownload = (material: Material) => {
    if (!user && material.price > 0) {
      toast({
        title: "Login Required",
        description: "Please login to purchase materials",
      });
      navigate('/auth');
      return;
    }
    
    if (material.price > 0) {
      toast({
        title: "Purchase Required",
        description: "This material requires payment. Please login to purchase.",
      });
      navigate('/auth');
    } else {
      toast({
        title: "Download Started",
        description: "Your download will begin shortly",
      });
    }
  };

  const formatFileSize = (sizeInMB: number) => {
    if (sizeInMB < 1) {
      return `${(sizeInMB * 1024).toFixed(0)} KB`;
    }
    return `${sizeInMB.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading materials...</p>
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
            <Button variant="ghost" onClick={() => navigate('/tutors')}>Find Tutors</Button>
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
          <h1 className="text-4xl font-bold mb-2">Learning Materials</h1>
          <p className="text-muted-foreground">Browse and download high-quality study materials</p>
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
                  placeholder="Search materials..."
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
                  <SelectItem value="">All subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All materials" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All materials</SelectItem>
                  <SelectItem value="free">Free only</SelectItem>
                  <SelectItem value="paid">Paid only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Materials Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredMaterials.map((material) => (
            <Card key={material.id} className="hover:shadow-elevated transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{material.title}</CardTitle>
                    <Badge variant="secondary" className="mb-2">{material.subject}</Badge>
                  </div>
                  {material.price === 0 ? (
                    <Badge className="bg-success">Free</Badge>
                  ) : (
                    <Badge className="bg-primary">${material.price}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  by {material.tutor.first_name} {material.tutor.last_name}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {material.description || 'High-quality study material to help you excel.'}
                </p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {material.file_type.toUpperCase()}
                  </div>
                  <div>{formatFileSize(material.file_size_mb)}</div>
                  <div className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {material.download_count}
                  </div>
                </div>

                <Button 
                  className="w-full"
                  onClick={() => handleDownload(material)}
                >
                  {material.price === 0 ? (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download Free
                    </>
                  ) : (
                    <>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Purchase ${material.price}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredMaterials.length === 0 && (
          <div className="text-center py-20">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No materials found</h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your search criteria
            </p>
            <Button onClick={() => {
              setSearchTerm('');
              setSelectedSubject('');
              setPriceFilter('');
            }}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
