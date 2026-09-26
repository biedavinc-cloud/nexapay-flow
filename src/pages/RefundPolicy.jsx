import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { NexaMark } from "@/components/NexaPayLogo";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-black/5">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <NexaMark size={28} />
            <span className="font-semibold text-lg text-[#081735]">NexaPay</span>
          </Link>
          <Link to="/" className="text-sm text-[#6D7A92] hover:text-[#081735] inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 prose prose-sm">
        <h1 className="text-3xl font-bold text-[#081735] mb-2">Refund Policy</h1>
        <p className="text-sm text-[#6D7A92] mb-8">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[#081735]">1. One-time onboarding / setup fee</h2>
          <p className="text-[#081735]/80">
            The one-time onboarding fee paid to activate a merchant account (Starter, Growth, or Scale plan)
            is <strong>non-refundable</strong>, in whole or in part, once payment has been captured and account
            access has been granted -- regardless of subsequent usage, account status changes, or account
            closure. This fee compensates NexaPay for merchant onboarding, KYC/compliance review, and account
            provisioning, all of which are performed immediately upon payment.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[#081735]">2. Per-transaction commission</h2>
          <p className="text-[#081735]/80">
            The per-transaction commission deducted at source is compensation for a service already rendered
            (payment processing and settlement) at the time each transaction completes, and is likewise
            non-refundable once a transaction has settled.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[#081735]">3. Disputed or failed transactions</h2>
          <p className="text-[#081735]/80">
            This policy governs NexaPay's own fees. It does not limit any right a paying customer may have to
            dispute a specific transaction with their card issuer or Mobile Money operator, or a merchant's own
            refund policy toward its customers, which remains the merchant's responsibility. A transaction that
            fails before fiat capture is confirmed (see status <code>failed</code>) is not charged in the first
            place; no refund is needed because no commission was ever deducted.
          </p>
        </section>

        <p className="text-xs text-[#6D7A92] mt-12">
          Questions about this policy can be sent to <a href="mailto:sales@nexapayme.org" className="underline">sales@nexapayme.org</a>.
        </p>
      </main>
    </div>
  );
}
