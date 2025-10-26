import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Upload, FileText, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface MaterialUploadProps {
  onUploadSuccess?: () => void;
}

export const MaterialUpload: React.FC<MaterialUploadProps> = ({ onUploadSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    price: 0,
    isPaid: false
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
    'History', 'Geography', 'Computer Science', 'Economics', 'Art'
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 50MB",
          variant: "destructive"
        });
        return;
      }

      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF, Word document, or PowerPoint file",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const uploadMaterial = async () => {
    if (!user || !selectedFile || !formData.title || !formData.subject) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and select a file",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('materials')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('materials')
        .getPublicUrl(fileName);

      // Save material metadata to database
      const { error: dbError } = await supabase
        .from('materials')
        .insert({
          title: formData.title,
          description: formData.description,
          subject: formData.subject,
          price: formData.isPaid ? formData.price : 0,
          file_url: publicUrl,
          file_type: selectedFile.type,
          file_size_mb: Number((selectedFile.size / (1024 * 1024)).toFixed(2)),
          tutor_id: user.id
        });

      if (dbError) throw dbError;

      toast({
        title: "Material uploaded successfully",
        description: "Your material is now available for students"
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        subject: '',
        price: 0,
        isPaid: false
      });
      setSelectedFile(null);

      if (onUploadSuccess) {
        onUploadSuccess();
      }

    } catch (error: any) {
      console.error('Error uploading material:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload material",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Learning Material
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="file">Select File</Label>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <input
              id="file"
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              className="hidden"
            />
            <label htmlFor="file" className="cursor-pointer">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {selectedFile ? (
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">Click to upload file</p>
                  <p className="text-sm text-muted-foreground">
                    PDF, Word, or PowerPoint files (max 50MB)
                  </p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Material Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Calculus Study Notes"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Select
              value={formData.subject}
              onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe what this material covers..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
        </div>

        {/* Pricing */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="paid-material"
              checked={formData.isPaid}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPaid: checked }))}
            />
            <Label htmlFor="paid-material">This is a paid material</Label>
          </div>

          {formData.isPaid && (
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-10"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
          )}
        </div>

        <Button 
          onClick={uploadMaterial} 
          disabled={uploading || !selectedFile || !formData.title || !formData.subject}
          className="w-full"
        >
          {uploading ? 'Uploading...' : 'Upload Material'}
        </Button>
      </CardContent>
    </Card>
  );
};