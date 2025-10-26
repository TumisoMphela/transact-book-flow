import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileText, Download, DollarSign, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface Material {
  id: string;
  title: string;
  description: string;
  subject: string;
  price: number;
  file_url: string;
  file_type: string;
  file_size_mb: number;
  download_count: number;
  tutor_id: string;
  created_at: string;
  is_approved: boolean;
  profiles: {
    first_name: string;
    last_name: string;
    profile_image_url?: string;
  };
}

interface MaterialPurchase {
  material_id: string;
  student_id: string;
  amount_paid: number;
  created_at: string;
}

export const MaterialLibrary: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [purchases, setPurchases] = useState<MaterialPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
    'History', 'Geography', 'Computer Science', 'Economics', 'Art'
  ];

  useEffect(() => {
    fetchMaterials();
    if (user) {
      fetchPurchases();
    }
  }, [user]);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select(`
          *,
          profiles!materials_tutor_id_fkey (
            first_name,
            last_name,
            profile_image_url
          )
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

  const fetchPurchases = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('material_purchases')
        .select('*')
        .eq('student_id', user.id);

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    }
  };

  const handleDownload = async (material: Material) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to download materials",
        variant: "destructive"
      });
      return;
    }

    // Check if it's a paid material and user hasn't purchased it
    if (material.price > 0) {
      const hasPurchased = purchases.some(p => p.material_id === material.id);
      if (!hasPurchased && material.tutor_id !== user.id) {
        await handlePurchase(material);
        return;
      }
    }

    // Proceed with download
    try {
      // Update download count
      await supabase
        .from('materials')
        .update({ download_count: material.download_count + 1 })
        .eq('id', material.id);

      // Open file in new tab
      window.open(material.file_url, '_blank');

      toast({
        title: "Download started",
        description: "Your file is being downloaded"
      });

      // Refresh materials to update download count
      fetchMaterials();
    } catch (error) {
      console.error('Error downloading material:', error);
      toast({
        title: "Download failed",
        description: "Failed to download material",
        variant: "destructive"
      });
    }
  };

  const handlePurchase = async (material: Material) => {
    try {
      // Create Stripe checkout session for material purchase
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          type: 'material',
          material_id: material.id,
          amount: material.price * 100, // Convert to cents
          title: material.title
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Purchase failed",
        description: "Failed to initiate purchase",
        variant: "destructive"
      });
    }
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSubject = !selectedSubject || selectedSubject === 'all' || material.subject === selectedSubject;
    
    const matchesPrice = !priceFilter || priceFilter === 'all' ||
                        (priceFilter === 'free' && material.price === 0) ||
                        (priceFilter === 'paid' && material.price > 0);

    return matchesSearch && matchesSubject && matchesPrice;
  });

  const formatFileSize = (sizeInMB: number) => {
    if (sizeInMB < 1) {
      return `${(sizeInMB * 1024).toFixed(0)} KB`;
    }
    return `${sizeInMB.toFixed(1)} MB`;
  };

  const getFileTypeIcon = (fileType: string) => {
    return <FileText className="h-8 w-8 text-primary" />;
  };

  const hasPurchased = (materialId: string) => {
    return purchases.some(p => p.material_id === materialId);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading materials...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Learning Materials Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <SelectItem value="all">All subjects</SelectItem>
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
                <SelectItem value="all">All materials</SelectItem>
                <SelectItem value="free">Free materials</SelectItem>
                <SelectItem value="paid">Paid materials</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setSelectedSubject('all');
                setPriceFilter('all');
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>

          {/* Materials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map((material) => (
              <Card key={material.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    {getFileTypeIcon(material.file_type)}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1 truncate">
                        {material.title}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {material.subject}
                      </Badge>
                    </div>
                    <div className="text-right">
                      {material.price > 0 ? (
                        <div className="flex items-center gap-1 text-primary font-semibold">
                          <DollarSign className="h-3 w-3" />
                          {material.price.toFixed(2)}
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Free
                        </Badge>
                      )}
                    </div>
                  </div>

                  {material.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {material.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={material.profiles.profile_image_url} />
                      <AvatarFallback className="text-xs">
                        {material.profiles.first_name?.[0]}
                        {material.profiles.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {material.profiles.first_name} {material.profiles.last_name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span>{formatFileSize(material.file_size_mb)}</span>
                    <span>{material.download_count} downloads</span>
                  </div>

                  <Button 
                    onClick={() => handleDownload(material)}
                    className="w-full"
                    variant={material.price > 0 && !hasPurchased(material.id) && material.tutor_id !== user?.id ? "default" : "secondary"}
                  >
                    {material.price > 0 && !hasPurchased(material.id) && material.tutor_id !== user?.id ? (
                      <>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Purchase ${material.price.toFixed(2)}
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredMaterials.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No materials found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};