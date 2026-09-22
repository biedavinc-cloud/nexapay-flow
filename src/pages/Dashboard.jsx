import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle, CheckCircle2, Clock, XCircle, Activity } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import TransactionTable from "@/components/TransactionTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Dashboard() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");

  useEffect(() => {
    let active = true;
    base44.entities.Transaction
      .list("-created_date", 100)
      .then((rows) => active && setTransactions(rows))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const filtered = transactions.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (methodFilter !== "ALL" && t.payment_method !== methodFilter) return false;
    return true;
  });

  const completed = transactions.filter((t) => t.status === "COMPLETED");
  const pending = transactions.filter((t) => ["PENDING", "FIAT_APPROVED", "PROCESSING_CRYPTO"].includes(t.status));
  const failed = transactions.filter((t) => t.status === "FAILED");
  const volume = completed.reduce((sum, t) => sum + Number(t.amount_fiat || 0), 0);
  const usdtVolume = completed.reduce((sum, t) => sum + Number(t.usdt_amount || 0), 0);

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Payment Router</h1>
          <p className="mt-1 text-sm text-muted-foreground">Monitor fiat → USDT execution across providers in real time.</p>
        </div>
        <Button
          onClick={() => navigate("/payments/new")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-shadow"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          New Payment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Settled Volume" value={`${completed[0]?.currency_fiat || "EUR"} ${volume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub={`${usdtVolume.toFixed(2)} USDT delivered`} icon={Activity} accent="text-emerald-400" />
        <StatCard label="Completed" value={completed.length} sub="successful payouts" icon={CheckCircle2} accent="text-emerald-400" />
        <StatCard label="In Flight" value={pending.length} sub="awaiting settlement" icon={Clock} accent="text-sky-400" />
        <StatCard label="Failed" value={failed.length} sub="requires attention" icon={XCircle} accent="text-red-400" />
      </div>

      {/* Table + filters */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Recent Transactions</h2>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 rounded-xl h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous statuts</SelectItem>
              <SelectItem value="PENDING">PENDING</SelectItem>
              <SelectItem value="FIAT_APPROVED">FIAT_APPROVED</SelectItem>
              <SelectItem value="PROCESSING_CRYPTO">PROCESSING_CRYPTO</SelectItem>
              <SelectItem value="COMPLETED">COMPLETED</SelectItem>
              <SelectItem value="FAILED">FAILED</SelectItem>
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-40 rounded-xl h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Toutes méthodes</SelectItem>
              <SelectItem value="CARD">Carte</SelectItem>
              <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
              <SelectItem value="BANK_TRANSFER">Virement</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <TransactionTable transactions={filtered} loading={loading} />
    </div>
  );
}