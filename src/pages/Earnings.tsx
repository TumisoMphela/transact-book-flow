import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Earning {
  id: string;
  source: 'material' | 'booking';
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  is_paid: boolean;
  created_at: string;
}

interface ConnectAccount {
  account_id: string;
  onboarding_complete: boolean;
}

export default function Earnings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [connectAccount, setConnectAccount] = useState<ConnectAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayout, setProcessingPayout] = useState(false);

  useEffect(() => {
    if (user) {
      fetchEarnings();
      fetchConnectAccount();
    }
  }, [user]);

  const fetchEarnings = async () => {
    const { data, error } = await supabase
      .from('earnings')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEarnings(data);
    }
    setLoading(false);
  };

  const fetchConnectAccount = async () => {
    const { data } = await supabase
      .from('connect_accounts')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    setConnectAccount(data);
  };

  const handleConnectStripe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        method: 'POST',
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handlePayout = async () => {
    const unpaidEarnings = earnings.filter(e => !e.is_paid);
    if (unpaidEarnings.length === 0) return;

    setProcessingPayout(true);
    try {
      const { data, error } = await supabase.functions.invoke('payout', {
        body: {
          earning_ids: unpaidEarnings.map(e => e.id),
        },
      });

      if (error) throw error;

      toast({
        title: 'Payout Successful',
        description: `R${data.amount.toFixed(2)} transferred to your account`,
      });

      fetchEarnings();
    } catch (error: any) {
      toast({
        title: 'Payout Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingPayout(false);
    }
  };

  const totalEarnings = earnings.reduce((sum, e) => sum + parseFloat(e.net_amount.toString()), 0);
  const paidEarnings = earnings.filter(e => e.is_paid).reduce((sum, e) => sum + parseFloat(e.net_amount.toString()), 0);
  const pendingEarnings = totalEarnings - paidEarnings;

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Earnings Dashboard</h1>

      {!connectAccount?.onboarding_complete && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Connect Your Stripe Account</h3>
                <p className="text-muted-foreground">
                  Complete your payout setup to receive earnings
                </p>
              </div>
              <Button onClick={handleConnectStripe}>
                Complete Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{totalEarnings.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{pendingEarnings.toFixed(2)}</div>
            {connectAccount?.onboarding_complete && pendingEarnings >= 20 && (
              <Button
                className="mt-2 w-full"
                onClick={handlePayout}
                disabled={processingPayout}
              >
                {processingPayout ? 'Processing...' : 'Request Payout'}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{paidEarnings.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {earnings.map((earning) => (
              <div
                key={earning.id}
                className="flex items-center justify-between border-b pb-4 last:border-0"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={earning.source === 'material' ? 'default' : 'secondary'}>
                      {earning.source}
                    </Badge>
                    {earning.is_paid ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(earning.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">R{parseFloat(earning.net_amount.toString()).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">
                    Fee: R{parseFloat(earning.platform_fee.toString()).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            {earnings.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No earnings yet. Start selling materials or booking sessions!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
