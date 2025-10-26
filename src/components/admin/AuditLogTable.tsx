import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

interface AuditLog {
  id: string;
  action: string;
  target_table: string;
  target_id: string;
  admin_id: string;
  reason: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

export const AuditLogTable: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Fetch admin profiles separately
      const adminIds = [...new Set((data || []).map(log => log.admin_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', adminIds);
      
      const profileMap = new Map(
        (profilesData || []).map(p => [p.user_id, { first_name: p.first_name, last_name: p.last_name }])
      );
      
      const enrichedLogs = (data || []).map(log => ({
        ...log,
        profiles: profileMap.get(log.admin_id)
      }));
      
      setLogs(enrichedLogs as AuditLog[]);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getActionColor = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes('approve')) return 'default';
    if (lower.includes('reject')) return 'destructive';
    if (lower.includes('verify')) return 'default';
    if (lower.includes('delete')) return 'destructive';
    return 'secondary';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log (Last 50 Actions)</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No audit logs</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Target ID</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.profiles?.first_name} {log.profiles?.last_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.target_table || '-'}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {log.target_id?.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-sm">{log.reason || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
