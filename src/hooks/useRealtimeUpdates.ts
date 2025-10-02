import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeUpdateProps {
  tableName: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  filter?: string;
}

export const useRealtimeUpdates = ({
  tableName,
  onInsert,
  onUpdate,
  onDelete,
  filter
}: RealtimeUpdateProps) => {
  useEffect(() => {
    const channel = supabase
      .channel(`${tableName}-changes`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tableName,
          filter
        },
        (payload) => {
          console.log(`${tableName} INSERT:`, payload);
          onInsert?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: tableName,
          filter
        },
        (payload) => {
          console.log(`${tableName} UPDATE:`, payload);
          onUpdate?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: tableName,
          filter
        },
        (payload) => {
          console.log(`${tableName} DELETE:`, payload);
          onDelete?.(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, onInsert, onUpdate, onDelete, filter]);
};