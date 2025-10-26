import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { WeeklyGrid } from '@/components/availability/WeeklyGrid';
import { DayAvailability, loadAvailability, saveAvailability } from '@/lib/availability';

export const Availability: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, isTutor } = useAuth();
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [originalAvailability, setOriginalAvailability] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !profile) return;
    
    if (!isTutor) {
      navigate('/dashboard');
      return;
    }

    fetchAvailability();
  }, [user, profile, isTutor]);

  const fetchAvailability = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await loadAvailability(user.id);
      setAvailability(data);
      setOriginalAvailability(JSON.parse(JSON.stringify(data)));
    } catch (error: any) {
      console.error('Error loading availability:', error);
      toast({
        title: "Error",
        description: "Failed to load availability",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      await saveAvailability(user.id, availability);
      setOriginalAvailability(JSON.parse(JSON.stringify(availability)));
      toast({
        title: "Success",
        description: "Availability saved successfully"
      });
    } catch (error: any) {
      console.error('Error saving availability:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save availability",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setAvailability(JSON.parse(JSON.stringify(originalAvailability)));
    toast({
      title: "Discarded",
      description: "Changes discarded"
    });
  };

  const isDirty = JSON.stringify(availability) !== JSON.stringify(originalAvailability);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Manage Availability</h1>
                <p className="text-sm text-muted-foreground">Set your weekly schedule</p>
              </div>
            </div>
            
            {isDirty && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDiscard}>
                  Discard
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <WeeklyGrid availability={availability} onChange={setAvailability} />
        </div>
      </main>
    </div>
  );
};

export default Availability;
