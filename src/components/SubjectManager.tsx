// src/components/SubjectManager.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Check, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Subject {
  id: string;
  name: string;
  description: string;
  category: string;
  is_approved: boolean;
  approval_status: string;
}

export const SubjectManager: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Other'
  });

  const categories = [
    'Mathematics', 'Science', 'Languages', 'Arts',
    'Technology', 'Business', 'Health', 'Other'
  ];

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name');
    
    if (!error) setSubjects(data || []);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Subject name required", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('subjects')
      .insert({
        name: formData.name,
        description: formData.description,
        category: formData.category
      });

    if (error) {
      toast({ title: "Failed to create subject", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Subject submitted", description: "Awaiting admin approval" });
      setFormData({ name: '', description: '', category: 'Other' });
      setShowCreate(false);
      fetchSubjects();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manage Subjects</h2>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Subject
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Subject</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Subject Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Advanced Calculus"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Submit for Approval</Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subjects.map(subject => (
          <Card key={subject.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{subject.name}</h3>
                <Badge variant={subject.is_approved ? "default" : "secondary"}>
                  {subject.is_approved ? (
                    <><Check className="mr-1 h-3 w-3" /> Approved</>
                  ) : (
                    <><Clock className="mr-1 h-3 w-3" /> Pending</>
                  )}
                </Badge>
              </div>
              <Badge variant="outline" className="mb-2">{subject.category}</Badge>
              {subject.description && (
                <p className="text-sm text-muted-foreground">{subject.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
