"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, LogOut, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/theme-toggle";
import FeedbackSection from "./feedback-section";

type Item = { id: string; name: string; category: string; location: string; status: "Lost" | "Found"; date_label: string; created_at: string };
type Access = "checking" | "signed-out" | "not-admin" | "admin";

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

export default function AdminPage() {
  const [access, setAccess] = useState<Access>("checking");
  const [items, setItems] = useState<Item[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!supabase) { setMessage("Connect Supabase before using the admin panel."); return; }
    setBusy(true);
    const { data, error } = await supabase.from("items").select("id,name,category,location,status,date_label,created_at").order("created_at", { ascending: false });
    if (error) setMessage(`Could not load reports: ${error.message}`);
    else { setItems((data || []) as Item[]); setMessage(""); }
    setBusy(false);
  }

  async function checkAccess() {
    if (!supabase) { setAccess("signed-out"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setAccess("signed-out"); return; }
    const isAdmin = session.user.app_metadata?.role === "admin";
    setAccess(isAdmin ? "admin" : "not-admin");
    if (isAdmin) await refresh();
  }

  useEffect(() => {
    void checkAccess();
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setAccess("signed-out"); setItems([]); }
      else { setAccess(session.user.app_metadata?.role === "admin" ? "admin" : "not-admin"); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) { setMessage("Connect Supabase before signing in."); return; }
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    setPassword(""); await checkAccess();
  }

  async function changeStatus(item: Item) {
    if (!supabase) return;
    const status = item.status === "Lost" ? "Found" : "Lost";
    const { error } = await supabase.from("items").update({ status }).eq("id", item.id);
    if (error) setMessage(`Could not update report: ${error.message}`);
    else setItems((current) => current.map((row) => row.id === item.id ? { ...row, status } : row));
  }

  async function removeItem(item: Item) {
    if (!supabase || !window.confirm(`Delete “${item.name}” permanently?`)) return;
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    if (error) setMessage(`Could not delete report: ${error.message}`);
    else setItems((current) => current.filter((row) => row.id !== item.id));
  }

  async function setAccountPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    if (newPassword.length < 8) { setPasswordMessage("Use a password with at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordMessage("The passwords do not match."); return; }
    setBusy(true); setPasswordMessage("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) { setPasswordMessage(error.message); return; }
    setNewPassword(""); setConfirmPassword("");
    setPasswordMessage("Password set. Now run the admin-role SQL in Supabase, then sign out and back in.");
  }

  return <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
    <nav className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Link href="/" className="text-2xl font-black tracking-tight">WhereIsIt<span className="text-indigo-600">.</span></Link><div className="flex items-center gap-4"><Link href="/browse" className="text-sm font-bold text-indigo-600">Browse public site</Link><ThemeToggle scope="admin"/></div></div></nav>
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <div className="mb-8 flex items-center gap-3"><div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700"><ShieldCheck size={24}/></div><div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Admin panel</p><h1 className="text-3xl font-black">Manage reports</h1></div></div>
      {access === "checking" ? <p className="rounded-2xl bg-white p-8 text-slate-500">Checking admin access…</p> : null}
      {access === "signed-out" && <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Admin sign in</h2><p className="mt-2 text-sm leading-6 text-slate-500">Use the admin account created in your Supabase project.</p><form onSubmit={signIn} className="mt-5 space-y-4"><label className="block text-sm font-bold">Email<input className={`${inputClass} mt-1.5`} required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}/></label><label className="block text-sm font-bold">Password<input className={`${inputClass} mt-1.5`} required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}/></label><button disabled={busy} className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button></form></section>}
      {access === "not-admin" && <section className="max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="font-black text-amber-900">Finish setting up your admin account</h2><p className="mt-2 text-sm leading-6 text-amber-800">You’re signed in from the invitation. Choose a password here, then grant this account the admin role in Supabase.</p><form onSubmit={setAccountPassword} className="mt-5 space-y-4"><label className="block text-sm font-bold">New password<input className={`${inputClass} mt-1.5`} required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}/></label><label className="block text-sm font-bold">Confirm password<input className={`${inputClass} mt-1.5`} required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}/></label><button disabled={busy} className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{busy ? "Saving…" : "Set password"}</button></form>{passwordMessage && <p role="status" className="mt-3 text-sm text-amber-900">{passwordMessage}</p>}<button onClick={() => void supabase?.auth.signOut().then(() => setAccess("signed-out"))} className="mt-4 rounded-xl border border-amber-300 px-4 py-2 text-sm font-bold text-amber-900">Sign out</button></section>}
      {access === "admin" && <><div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900"><span>Signed in as an administrator. {items.length} shared reports.</span><div className="flex gap-2"><button onClick={() => void refresh()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-bold"><RefreshCw size={15}/> Refresh</button><button onClick={() => void supabase?.auth.signOut()} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-bold"><LogOut size={15}/> Sign out</button></div></div>
      {message && <p role="status" className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{message}</p>}
      {items.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">{busy ? "Loading reports…" : "No shared reports yet."}</div> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Item</th><th className="px-5 py-4">Location</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((item) => <tr key={item.id}><td className="px-5 py-4"><p className="font-bold">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.category} · {item.date_label}</p></td><td className="px-5 py-4 text-slate-600">{item.location}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${item.status === "Lost" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{item.status}</span></td><td className="px-5 py-4"><div className="flex gap-2"><button onClick={() => void changeStatus(item)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50">Mark {item.status === "Lost" ? "found" : "lost"}</button><button aria-label={`Delete ${item.name}`} onClick={() => void removeItem(item)} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div></div>}</>}
      {access === "admin" && <FeedbackSection/>}
      {message && access !== "admin" && <p role="status" className="mt-4 max-w-md rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{message}</p>}
      <Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600"><ArrowLeft size={16}/> Back to site</Link>
    </div>
  </main>;
}
