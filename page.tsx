"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ShieldCheck,
  Building2,
  Users,
  TrendingUp,
  IndianRupee,
  Tag,
  MessageSquareWarning,
  ClipboardList,
  LayoutDashboard,
  Store,
  Repeat,
  Clock,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Sidebar, MobileTabBar, SidebarItem } from "@/components/Sidebar";
import { OverviewBento } from "@/components/OverviewBento";
import { buildings, vendors, orders, subscriptionPlans } from "@/lib/demo-data";

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  return loggedIn ? <Dashboard onLogout={() => setLoggedIn(false)} /> : <LoginScreen onLogin={() => setLoggedIn(true)} />;
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-[100dvh] flex-1 items-center justify-center bg-ink px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber/15 text-amber-soft">
            <ShieldCheck size={26} />
          </span>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Admin Panel</h1>
          <p className="mt-1 text-sm text-paper-dim">Manage every building from one place</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onLogin();
          }}
          className="rounded-2xl border border-line bg-ink-soft p-6"
        >
          <label className="block text-xs font-medium text-paper-dim">Work email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@pyala.in"
            className="mt-1.5 w-full rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim/60 focus:border-amber"
          />
          <label className="mt-5 block text-xs font-medium text-paper-dim">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1.5 w-full rounded-xl border border-line bg-ink px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim/60 focus:border-amber"
          />
          <button
            type="submit"
            className="mt-6 w-full rounded-full bg-amber py-3 text-sm font-medium text-ink transition-transform active:scale-[0.97] hover:bg-amber-soft"
          >
            Sign in
          </button>
          <p className="mt-4 text-center text-xs text-paper-dim font-mono">Demo — any email & password works</p>
        </form>
        <Link href="/" className="mt-6 block text-center text-sm text-paper-dim hover:text-paper transition-colors">
          ← Back to Pyala
        </Link>
      </motion.div>
    </div>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState("overview");

  const totalRevenue = buildings.reduce((s, b) => s + b.revenueMonth, 0);
  const totalUsers = buildings.reduce((s, b) => s + b.activeUsers, 0);
  const totalOffices = buildings.reduce((s, b) => s + b.offices, 0);

  const items: SidebarItem[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
    { id: "buildings", label: "Buildings", icon: <Building2 size={16} />, badge: buildings.length },
    { id: "vendors", label: "Vendors", icon: <Store size={16} />, badge: vendors.length },
    { id: "subscriptions", label: "Subscriptions", icon: <Repeat size={16} /> },
    { id: "offers", label: "Offers", icon: <Tag size={16} /> },
    { id: "disputes", label: "Disputes", icon: <MessageSquareWarning size={16} />, badge: 1 },
  ];

  return (
    <div className="min-h-[100dvh] flex-1 bg-ink">
      <Sidebar
        brandLetter="P"
        brandName="Pyala Admin"
        brandSub="Super admin"
        items={items}
        active={tab}
        onSelect={setTab}
        onLogout={onLogout}
      />

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/60 bg-ink/90 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-2 md:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber text-ink font-display font-bold">
              P
            </span>
            <span className="font-display text-sm font-semibold">Pyala Admin</span>
          </div>
          <div className="hidden text-sm text-paper-dim md:block">4 buildings · 350+ offices under management</div>
          <span className="flex items-center gap-1.5 text-xs text-paper-dim">
            <span className="h-1.5 w-1.5 rounded-full bg-good animate-pulse" />
            All systems live
          </span>
        </header>
        <MobileTabBar items={items} active={tab} onSelect={setTab} />

        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard icon={<IndianRupee size={16} />} label="Revenue (month)" value={`₹${(totalRevenue / 100000).toFixed(1)}L`} />
            <StatCard icon={<Building2 size={16} />} label="Buildings live" value={String(buildings.length)} />
            <StatCard icon={<Users size={16} />} label="Active users" value={totalUsers.toLocaleString("en-IN")} />
            <StatCard icon={<ClipboardList size={16} />} label="Offices covered" value={String(totalOffices)} />
          </div>

          <div className="mt-8">
            {tab === "overview" && <OverviewBento />}
            {tab === "buildings" && <BuildingsTab />}
            {tab === "vendors" && <VendorsTab />}
            {tab === "subscriptions" && <SubscriptionsTab />}
            {tab === "offers" && <OffersTab />}
            {tab === "disputes" && <DisputesTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-ink-soft p-4">
      <div className="flex items-center gap-1.5 text-paper-dim">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-2 font-mono text-2xl text-paper">{value}</div>
    </div>
  );
}

function BuildingsTab() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {buildings.map((b) => (
        <div key={b.id} className="rounded-2xl border border-line bg-ink-soft p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-display text-base font-semibold">{b.name}</h3>
              <p className="mt-1 text-xs text-paper-dim">{b.offices} offices · {b.activeUsers} active users</p>
            </div>
            <Building2 size={18} className="text-amber-soft" />
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
            <span className="text-paper-dim">Vendor</span>
            <span className="text-paper">{b.vendor}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-paper-dim">Revenue this month</span>
            <span className="font-mono text-paper">₹{b.revenueMonth.toLocaleString("en-IN")}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function VendorsTab() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-ink-soft text-left text-xs text-paper-dim">
            <th className="px-4 py-3 font-medium">Vendor</th>
            <th className="px-4 py-3 font-medium">Building</th>
            <th className="px-4 py-3 font-medium">Accept rate</th>
            <th className="px-4 py-3 font-medium">Avg prep</th>
            <th className="px-4 py-3 font-medium">Rating</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {vendors.map((v) => (
            <tr key={v.id} className="bg-ink-soft/40">
              <td className="px-4 py-3 text-paper">{v.name}</td>
              <td className="px-4 py-3 text-paper-dim">{v.building}</td>
              <td className="px-4 py-3 font-mono text-paper-dim">{v.acceptRate}%</td>
              <td className="px-4 py-3 font-mono text-paper-dim">{v.avgPrepTime}</td>
              <td className="px-4 py-3 font-mono text-paper-dim">{v.rating}★</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                  v.status === "active" ? "border-good/30 bg-good/10 text-good" : "border-warn/30 bg-warn/10 text-warn"
                }`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {v.status === "active" ? "Active" : "On leave"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubscriptionsTab() {
  const subscriberCounts: Record<string, number> = {
    "plan-daily": 284,
    "plan-twice": 412,
    "plan-combo": 197,
    "plan-team": 63,
  };
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {subscriptionPlans.map((p) => (
        <div key={p.id} className="rounded-2xl border border-line bg-ink-soft p-5">
          <h3 className="font-display text-base font-semibold">{p.name}</h3>
          <p className="mt-1 text-xs text-paper-dim">{p.tagline}</p>
          <div className="mt-4 font-mono text-2xl text-paper">₹{p.price}<span className="text-xs text-paper-dim">/{p.period}</span></div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-paper-dim">
            <span>Active subscribers</span>
            <span className="font-mono text-paper">{subscriberCounts[p.id]}</span>
          </div>
          <button className="mt-4 w-full rounded-full border border-line py-2 text-xs font-medium text-paper-dim transition-colors hover:border-amber hover:text-amber-soft">
            Edit plan
          </button>
        </div>
      ))}
    </div>
  );
}

function OffersTab() {
  const offers = [
    { code: "FIRST50", desc: "50% off on first order", used: 312, active: true },
    { code: "MONSOON20", desc: "20% off Kulhad Chai this week", used: 148, active: true },
    { code: "REFER25", desc: "₹25 wallet credit for referrals", used: 601, active: true },
    { code: "DIWALI10", desc: "10% off festive combo", used: 89, active: false },
  ];
  return (
    <div className="space-y-3">
      {offers.map((o) => (
        <div key={o.code} className="flex items-center justify-between rounded-2xl border border-line bg-ink-soft p-4">
          <div className="flex items-center gap-3">
            <Tag size={16} className="text-amber-soft" />
            <div>
              <div className="font-mono text-sm text-paper">{o.code}</div>
              <div className="text-xs text-paper-dim">{o.desc}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="font-mono text-paper-dim">{o.used} used</span>
            <span className={`rounded-full px-2.5 py-1 ${o.active ? "bg-good/10 text-good" : "bg-line text-paper-dim"}`}>
              {o.active ? "Active" : "Ended"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DisputesTab() {
  const tickets = [
    { id: "TCK-201", order: "ORD-8836", issue: "Order rejected without reason", status: "Open", user: "Sneha R." },
    { id: "TCK-200", order: "ORD-8790", issue: "Wrong item delivered", status: "Resolved", user: "Devansh P." },
    { id: "TCK-199", order: "ORD-8765", issue: "Subscription charged after pause", status: "Investigating", user: "Karan V." },
  ];
  return (
    <div className="space-y-3">
      {tickets.map((t) => (
        <div key={t.id} className="flex items-start justify-between rounded-2xl border border-line bg-ink-soft p-4">
          <div className="flex gap-3">
            <MessageSquareWarning size={16} className="mt-0.5 text-amber-soft" />
            <div>
              <div className="text-sm text-paper">{t.issue}</div>
              <div className="mt-1 text-xs text-paper-dim font-mono">{t.id} · {t.order} · {t.user}</div>
            </div>
          </div>
          <span
            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${
              t.status === "Open"
                ? "bg-warn/10 text-warn"
                : t.status === "Resolved"
                ? "bg-good/10 text-good"
                : "bg-amber/10 text-amber-soft"
            }`}
          >
            {t.status}
          </span>
        </div>
      ))}
    </div>
  );
}
