"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquareText, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Feedback = { id: string; name: string; message: string; rating: number; created_at: string };

export default function FeedbackSection() {
  const [entries, setEntries] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");

  const loadFeedback = useCallback(async () => {
    if (!supabase) { setNotice("Connect Supabase to manage feedback."); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("feedback").select("id,name,message,rating,created_at").order("created_at", { ascending: false });
    if (error) setNotice(`Could not load feedback: ${error.message}`);
    else { setEntries((data || []) as Feedback[]); setNotice(""); }
    setLoading(false);
  }, []);

  useEffect(() => { void loadFeedback(); }, [loadFeedback]);

  async function deleteFeedback(entry: Feedback) {
    if (!supabase || !window.confirm("Delete this feedback permanently?")) return;
    setBusyId(entry.id); setNotice("");
    const { error } = await supabase.from("feedback").delete().eq("id", entry.id);
    if (error) setNotice(`Could not delete feedback: ${error.message}`);
    else setEntries((current) => current.filter((candidate) => candidate.id !== entry.id));
    setBusyId("");
  }

  return <section className="mt-10">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700"><MessageSquareText size={20}/></div><div><h2 className="text-xl font-black">Community feedback</h2><p className="text-sm text-slate-500">{entries.length} feedback {entries.length === 1 ? "message" : "messages"}</p></div></div>
      <button onClick={() => void loadFeedback()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15}/> Refresh feedback</button>
    </div>
    {notice && <p role="status" className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{notice}</p>}
    {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading feedback…</div> : entries.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">No feedback has been submitted yet.</div> : <div className="space-y-3">{entries.map((entry) => <article key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h3 className="font-bold">{entry.name || "Community member"}</h3><span className="text-amber-500" aria-label={`${entry.rating} out of 5 stars`}>{"★".repeat(entry.rating)}<span className="text-slate-300">{"☆".repeat(Math.max(0, 5 - entry.rating))}</span></span><time className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString()}</time></div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{entry.message}</p></div><button onClick={() => void deleteFeedback(entry)} disabled={busyId === entry.id} aria-label={`Delete feedback from ${entry.name}`} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={15}/>{busyId === entry.id ? "Deleting…" : "Delete"}</button></div></article>)}</div>}
  </section>;
}
