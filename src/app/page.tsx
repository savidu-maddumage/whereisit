"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, ImagePlus, LocateFixed, MapPin, MessageSquareText, PackagePlus, Search, ShieldCheck, X } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/theme-toggle";

type LostFoundItem = {
  id: string;
  name: string;
  category: string;
  location: string;
  address?: string;
  image?: string;
  date: string;
  status: "Lost" | "Found";
  description: string;
  ownerName: string;
  email: string;
  phone: string;
  lat?: number;
  lng?: number;
};

type DbItem = { id: string; name: string; category: string; location: string; address: string | null; image_url: string | null; date_label: string; status: "Lost" | "Found"; description: string; owner_name: string; email: string; phone: string; lat: number | null; lng: number | null };
type DbFeedback = { id: string; name: string; message: string; rating: number; created_at: string };

function fromDbItem(row: DbItem): LostFoundItem {
  return { id: row.id, name: row.name, category: row.category, location: row.location, address: row.address || undefined, image: row.image_url || undefined, date: row.date_label, status: row.status, description: row.description, ownerName: row.owner_name, email: row.email, phone: row.phone, lat: row.lat ?? undefined, lng: row.lng ?? undefined };
}

const STORAGE_KEY = "whereisit-items-v1";
const ITEMS_PER_PAGE = 9;
const CATEGORIES = ["People", "Vehicle", "Electronics", "Documents", "Pets", "Jewelry", "Bags", "Wallet", "Mobile phone", "Other"];
const FEEDBACK_KEY = "whereisit-feedback-v1";
const samples: LostFoundItem[] = [
  { id: "sample-wallet", name: "Black leather wallet", category: "Wallet", location: "Colombo, Sri Lanka", date: "Today", status: "Lost", description: "Black bifold wallet with cards inside. Please contact me if found.", ownerName: "Nimal", email: "", phone: "" },
  { id: "sample-keys", name: "Set of house keys", category: "Other", location: "Negombo, Sri Lanka", date: "Today", status: "Found", description: "Found near the bus station. Key ring has a blue tag.", ownerName: "Amaya", email: "", phone: "" },
  { id: "sample-headphones", name: "Wireless headphones", category: "Electronics", location: "Gampaha, Sri Lanka", date: "Yesterday", status: "Lost", description: "Over-ear headphones in a dark case.", ownerName: "Kasun", email: "", phone: "" },
];

const inputClass = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

export default function Home() {
  return <WhereIsItApp />;
}

export function WhereIsItApp() {
  const [items, setItems] = useState<LostFoundItem[]>(samples);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All items");
  const [currentPage, setCurrentPage] = useState(1);
  const [reportStatus, setReportStatus] = useState<"Lost" | "Found" | null>(null);
  const [foundItem, setFoundItem] = useState<LostFoundItem | null>(null);
  const [notice, setNotice] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [feedback, setFeedback] = useState<{ name: string; message: string; rating: string; date: string }[]>([]);
  const [imageData, setImageData] = useState("");

  useEffect(() => {
    let active = true;
    async function loadCommunity() {
      let localItems: LostFoundItem[] = [];
      let localFeedback: { name: string; message: string; rating: string; date: string }[] = [];
      try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) localItems = JSON.parse(saved); } catch { /* Keep sample items available if saved data is unreadable. */ }
      try { const saved = localStorage.getItem(FEEDBACK_KEY); if (saved) localFeedback = JSON.parse(saved); } catch { /* Feedback is optional. */ }
      if (active) { setItems([...localItems, ...samples]); setFeedback(localFeedback); }
      if (supabase) {
        const [{ data: reports, error: reportsError }, { data: notes }] = await Promise.all([
          supabase.from("items").select("*").order("created_at", { ascending: false }),
          supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(30),
        ]);
        if (active && reports && !reportsError) {
          const sharedItems = reports.map((row) => fromDbItem(row as DbItem));
          const visibleSamples = samples.filter((sample) => !sharedItems.some((item) => item.name === sample.name && item.status === sample.status));
          const combined = [...sharedItems, ...localItems, ...visibleSamples];
          setItems(combined.filter((item, index) => combined.findIndex((candidate) => candidate.id === item.id) === index));
        }
        if (active && notes) setFeedback((notes as DbFeedback[]).map((note) => ({ name: note.name, message: note.message, rating: String(note.rating), date: new Date(note.created_at).toLocaleDateString() })));
        if (active && reportsError) setNotice(`Could not load shared reports: ${reportsError.message}`);
      }
      if (active) setReady(true);
    }
    void loadCommunity();
    return () => { active = false; };
  }, []);

  const visibleItems = useMemo(() => items.filter((item) => {
    const matchesFilter = filter === "All items" || item.status === filter;
    const term = search.trim().toLowerCase();
    const matchesCategory = categoryFilter === "All categories" || item.category === categoryFilter;
    return matchesFilter && matchesCategory && (!term || `${item.name} ${item.category} ${item.location} ${item.address || ""} ${item.description}`.toLowerCase().includes(term));
  }), [items, filter, categoryFilter, search]);
  const pageCount = Math.ceil(visibleItems.length / ITEMS_PER_PAGE);
  const pageItems = visibleItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [search, filter, categoryFilter]);

  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const item: LostFoundItem = {
      id: crypto.randomUUID(), name: String(data.get("name")).trim(), category: String(data.get("category")),
      location: String(data.get("location")).trim(), address: String(data.get("address")).trim() || undefined, image: imageData || undefined, date: new Date().toLocaleDateString(), status: reportStatus!,
      description: String(data.get("description")).trim(), ownerName: String(data.get("ownerName")).trim(),
      email: String(data.get("email")).trim(), phone: String(data.get("phone")).trim(),
      lat: data.get("lat") ? Number(data.get("lat")) : undefined, lng: data.get("lng") ? Number(data.get("lng")) : undefined,
    };
    if (supabase) {
      try {
        let imageUrl: string | null = null;
        if (imageData) {
          const imageBlob = await (await fetch(imageData)).blob();
          const { error: uploadError } = await supabase.storage.from("item-images").upload(`${item.id}.jpg`, imageBlob, { contentType: "image/jpeg", upsert: true });
          if (uploadError) throw uploadError;
          imageUrl = supabase.storage.from("item-images").getPublicUrl(`${item.id}.jpg`).data.publicUrl;
        }
        const { data: row, error } = await supabase.from("items").insert({ id: item.id, name: item.name, category: item.category, location: item.location, address: item.address || null, image_url: imageUrl, date_label: item.date, status: item.status, description: item.description, owner_name: item.ownerName, email: item.email, phone: item.phone, lat: item.lat ?? null, lng: item.lng ?? null }).select("*").single();
        if (error) throw error;
        setItems((current) => [fromDbItem(row as DbItem), ...current.filter((entry) => entry.id !== item.id)]);
        setImageData(""); setReportStatus(null); setNotice("Your report and photo are now shared with the community.");
        return;
      } catch (error) {
        setNotice(`Supabase could not save this report. Check the setup and try again. ${error instanceof Error ? error.message : ""}`);
        return;
      }
    }
    const next = [item, ...items];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.filter((entry) => !entry.id.startsWith("sample-"))));
      setItems(next); setImageData(""); setReportStatus(null); setNotice("Your item has been added to the community list.");
    } catch { setNotice("The photo or saved reports are using too much browser storage. Try a smaller photo."); }
  }

  async function prepareImage(file?: File) {
    if (!file) { setImageData(""); return; }
    if (!file.type.startsWith("image/")) { setNotice("Choose an image file."); return; }
    if (file.size > 12 * 1024 * 1024) { setNotice("Choose an image smaller than 12 MB."); return; }
    const original = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
    const photo = new Image();
    photo.onload = () => {
      const scale = Math.min(1, 900 / Math.max(photo.width, photo.height));
      const canvas = document.createElement("canvas"); canvas.width = Math.round(photo.width * scale); canvas.height = Math.round(photo.height * scale);
      canvas.getContext("2d")?.drawImage(photo, 0, 0, canvas.width, canvas.height);
      setImageData(canvas.toDataURL("image/jpeg", 0.78));
    };
    photo.onerror = () => setNotice("This image could not be opened. Try another photo.");
    photo.src = original;
  }

  async function saveFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const entry = { name: String(data.get("feedbackName")).trim() || "Community member", message: String(data.get("feedbackMessage")).trim(), rating: String(data.get("rating")), date: new Date().toLocaleDateString() };
    if (supabase) {
      const { error } = await supabase.from("feedback").insert({ name: entry.name, message: entry.message, rating: Number(entry.rating) });
      if (error) { setNotice(`Could not submit feedback to Supabase. ${error.message}`); return; }
      const next = [entry, ...feedback].slice(0, 30); setFeedback(next); form.reset(); setNotice("Thank you. Your feedback was shared with the community."); return;
    }
    const next = [entry, ...feedback].slice(0, 30);
    setFeedback(next); localStorage.setItem(FEEDBACK_KEY, JSON.stringify(next)); form.reset(); setNotice("Thank you. Your feedback has been saved on this device.");
  }

  function startReport(status: "Lost" | "Found") { setImageData(""); setReportStatus(status); }

  function useCurrentLocation(form: HTMLFormElement) {
    if (!navigator.geolocation) { setNotice("Location sharing is not available in this browser."); return; }
    setNotice("Waiting for location permission…");
    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position.coords.latitude; const lng = position.coords.longitude;
      (form.elements.namedItem("lat") as HTMLInputElement).value = String(lat);
      (form.elements.namedItem("lng") as HTMLInputElement).value = String(lng);
      (form.elements.namedItem("address") as HTMLInputElement).value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setNotice("Exact coordinates added. They will appear on the map.");
    }, () => setNotice("Could not get your location. Allow location access or enter a place name."), { enableHighAccuracy: true, timeout: 12000 });
  }

  function notifyOwner(channel: "email" | "sms", contact: { phone: string; location: string }) {
    if (!foundItem) return;
    const body = `Hello ${foundItem.ownerName}, I found your reported item: ${foundItem.name}. I found it at: ${contact.location || "location not provided"}. My contact number: ${contact.phone || "not provided"}.`;
    const href = channel === "email"
      ? `mailto:${foundItem.email}?subject=${encodeURIComponent(`Found: ${foundItem.name}`)}&body=${encodeURIComponent(body)}`
      : `sms:${foundItem.phone}?body=${encodeURIComponent(body)}`;
    window.location.href = href;
  }

  async function reportItemFound(item: LostFoundItem) {
    if (!supabase || item.id.startsWith("sample-")) {
      setNotice("This is a local sample report, so admins can’t see a found alert for it.");
      setFoundItem(item);
      return;
    }
    const { data, error } = await supabase.rpc("report_item_found", { p_item_id: item.id });
    if (error) setNotice(`Could not send the found alert to admins. ${error.message}`);
    else if (data) setNotice("Admins have been notified that someone reports finding this item. It is not marked resolved yet.");
    else setNotice("This report is no longer marked as lost.");
    setFoundItem(item);
  }

  const isBrowse = pathname === "/browse";
  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <nav className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="text-2xl font-black tracking-tight">WhereIsIt<span className="text-indigo-600">.</span></Link>
          <div className="hidden items-center gap-8 text-sm font-semibold text-slate-500 md:flex"><Link href="/browse" className="hover:text-indigo-600">Browse items</Link><a href="#how" className="hover:text-indigo-600">How it works</a><a href="#feedback" className="hover:text-indigo-600">Feedback</a></div>
          <div className="flex items-center gap-2"><ThemeToggle scope="public"/><button onClick={() => startReport("Lost")} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">Report an item</button></div>
        </div>
      </nav>
      {!isSupabaseConfigured && <div className="bg-amber-50 px-5 py-2.5 text-center text-xs font-semibold text-amber-800">Supabase isn’t connected yet. Reports and feedback currently stay in this browser.</div>}

      {!isBrowse && <section className="relative overflow-hidden bg-white">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl"/><div className="pointer-events-none absolute -right-28 top-20 h-96 w-96 rounded-full bg-violet-200/40 blur-3xl"/>
        <div className="relative mx-auto max-w-7xl px-5 py-20 text-center md:px-8 md:py-28">
          <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-xs font-bold text-indigo-700 shadow-sm"><ShieldCheck size={15}/> A community that helps things find their way home</div>
          <h1 className="mx-auto max-w-4xl text-5xl font-black tracking-tight sm:text-7xl">Lost something?<span className="mt-1 block bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">Let&apos;s find it.</span></h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-500 md:text-lg">Report a lost or found item, browse nearby reports, and help reunite belongings with their owners.</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><button onClick={() => startReport("Lost")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 font-bold text-white shadow-xl shadow-indigo-600/20 hover:-translate-y-0.5 hover:bg-indigo-700"><PackagePlus size={19}/> Report lost item</button><button onClick={() => startReport("Found")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-4 font-bold text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600"><MapPin size={19}/> Report found item</button></div>
          <div className="mx-auto mt-10 flex max-w-2xl items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 pl-4 shadow-xl shadow-slate-200/50"><Search className="shrink-0 text-slate-400" size={20}/><input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" })} placeholder="Search wallets, phones, keys…" className="w-full bg-transparent py-3 text-sm outline-none"/><button onClick={() => document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" })} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">Search</button></div>
          <p className="mt-5 text-xs text-slate-400">Your location is only shared when you choose to add it to a report.</p>
        </div>
      </section>}

      <section id="browse" className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row"><div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4"><Search size={18} className="text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by item or location" className="w-full bg-transparent py-3 text-sm outline-none"/></div><select aria-label="Filter items" value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"><option>All items</option><option>Lost</option><option>Found</option></select><select aria-label="Filter by category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"><option>All categories</option>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></div>
        {!ready ? <div className="rounded-2xl bg-white p-10 text-center text-slate-500">Loading community reports…</div> : visibleItems.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{pageItems.map((item) => <article key={item.id} onClick={() => router.push(`/items/${encodeURIComponent(item.id)}`)} onKeyDown={(e) => e.key === "Enter" && router.push(`/items/${encodeURIComponent(item.id)}`)} role="link" tabIndex={0} className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70"><div className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-100">{item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover"/> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm"><MapPin size={26}/></div>}<span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-black ${item.status === "Lost" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{item.status}</span><span className="absolute bottom-3 right-4 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-indigo-600">View details & map <ArrowRight size={13}/></span></div><div className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{item.category}</p><h3 className="mt-1 text-lg font-black group-hover:text-indigo-600">{item.name}</h3><p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{item.description}</p><div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500"><span className="flex min-w-0 items-center gap-1.5 truncate"><MapPin size={14} className="shrink-0"/>{item.address || item.location}</span><span className="flex shrink-0 items-center gap-1"><Clock3 size={13}/>{item.date}</span></div>{item.status === "Lost" && <button onClick={(e) => { e.stopPropagation(); void reportItemFound(item); }} className="mt-4 w-full rounded-xl bg-indigo-50 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100">I found this item</button>}</div></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><p className="font-bold">No items match that search.</p><p className="mt-1 text-sm text-slate-500">Try another search or remove the filter.</p></div>}
        {ready && pageCount > 1 && <nav aria-label="Report pages" className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => <button type="button" key={page} onClick={() => setCurrentPage(page)} aria-current={currentPage === page ? "page" : undefined} className={`h-10 min-w-10 rounded-xl border px-3 text-sm font-bold ${currentPage === page ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{page}</button>)}
          <button type="button" onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} disabled={currentPage === pageCount} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
        </nav>}
      </section>

      <section id="how" className="scroll-mt-24 border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto mb-10 max-w-xl text-center">
            <p className="mb-2 text-xs font-black tracking-[.16em] text-indigo-600">SIMPLE PROCESS</p>
            <h2 className="text-3xl font-black">How WhereIsIt works</h2>
            <p className="mt-3 text-slate-500">Three simple steps to help belongings find their way home.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[{ n: "01", title: "Report an item", body: "Add the item details and where it was lost or found." }, { n: "02", title: "Browse reports", body: "Search the community reports and open item locations in Maps." }, { n: "03", title: "Reconnect", body: "Contact the owner safely when you find a matching item." }].map((step) => <div key={step.n} className="text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 font-black text-indigo-600">{step.n}</div><h3 className="font-black">{step.title}</h3><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">{step.body}</p></div>)}
          </div>
        </div>
      </section>

      <section id="feedback" className="border-y border-slate-200 bg-white py-16"><div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[.85fr_1.15fr] md:px-8"><div><p className="mb-2 text-xs font-black tracking-[.16em] text-indigo-600">YOUR VOICE MATTERS</p><h2 className="text-3xl font-black">Help us improve</h2><p className="mt-3 max-w-md text-slate-500">Share a suggestion or tell us how your lost-and-found experience went.</p><div className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-500"><MessageSquareText size={18} className="text-indigo-500"/> {isSupabaseConfigured ? "Feedback is shared with the community." : "Feedback is saved on this device."}</div></div><div><form onSubmit={saveFeedback} className="grid gap-3 sm:grid-cols-2"><input name="feedbackName" maxLength={80} placeholder="Your name (optional)" className={inputClass}/><select name="rating" className={inputClass}><option value="5">Excellent</option><option value="4">Good</option><option value="3">Okay</option><option value="2">Needs work</option><option value="1">Poor</option></select><textarea name="feedbackMessage" required maxLength={600} rows={4} placeholder="What would you like us to know?" className={`${inputClass} sm:col-span-2`}/><button className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 sm:col-span-2 sm:justify-self-end">Send feedback</button></form>{feedback.length > 0 && <div className="mt-6 space-y-3">{feedback.slice(0, 3).map((entry, index) => <div key={`${entry.date}-${index}`} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between gap-3 text-sm"><strong>{entry.name}</strong><span className="text-amber-500">{"★".repeat(Number(entry.rating))}</span></div><p className="mt-1 text-sm text-slate-600">{entry.message}</p></div>)}</div>}</div></div></section>

      <footer className="bg-slate-950 py-8 text-white"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 sm:flex-row sm:items-center md:px-8"><div><strong className="text-lg">WhereIsIt<span className="text-indigo-400">.</span></strong><p className="mt-1 text-sm text-slate-400">Helping lost things find their way home.</p></div><p className="text-xs text-slate-500">© 2026 WhereIsIt</p></div></footer>

      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl"><Check size={17} className="shrink-0 text-emerald-400"/>{notice}<button aria-label="Dismiss" onClick={() => setNotice("")}><X size={16}/></button></div>}

      {reportStatus && <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"><div className="my-auto w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"><div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-black tracking-[.14em] text-indigo-600">COMMUNITY REPORT</p><h2 className="mt-1 text-2xl font-black">Report {reportStatus.toLowerCase()} item</h2><p className="mt-1 text-sm text-slate-500">Add a photo and location details to help people recognize it.</p></div><button aria-label="Close" onClick={() => { setImageData(""); setReportStatus(null); }} className="rounded-full bg-slate-100 p-2 hover:bg-slate-200"><X size={18}/></button></div><form onSubmit={saveItem} className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Item name<input name="name" required maxLength={80} placeholder="e.g. Blue backpack" className={inputClass}/></label><label className="text-sm font-bold">Category<select name="category" className={inputClass}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><div className="sm:col-span-2"><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-4 text-sm font-bold text-indigo-700 hover:bg-indigo-50"><ImagePlus size={18}/> {imageData ? "Choose a different photo" : "Upload an item photo (optional)"}<input type="file" accept="image/*" className="sr-only" onChange={(e) => { void prepareImage(e.target.files?.[0]); }}/></label>{imageData && <img src={imageData} alt="Preview of uploaded item" className="mt-3 h-40 w-full rounded-xl object-cover"/>}<p className="mt-1 text-xs text-slate-400">Image files up to 12 MB. The saved copy is resized for storage.</p></div><label className="text-sm font-bold sm:col-span-2">City or area<input name="location" required maxLength={160} placeholder="e.g. Colombo, Sri Lanka" className={inputClass}/><input name="lat" type="hidden"/><input name="lng" type="hidden"/></label><label className="text-sm font-bold sm:col-span-2">Street address or landmark<input name="address" maxLength={240} placeholder="Optional — add a nearby address or landmark" className={inputClass}/></label><div className="sm:col-span-2"><button type="button" onClick={(e) => useCurrentLocation(e.currentTarget.form!)} className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800"><LocateFixed size={16}/> Use my current location</button><p className="mt-1 text-xs text-slate-400">Your browser will ask permission. Coordinates will be added to the address.</p></div><label className="text-sm font-bold sm:col-span-2">Description<textarea name="description" required maxLength={500} rows={3} placeholder="Color, identifying details, and any other helpful information" className={inputClass}/></label><label className="text-sm font-bold">Your name<input name="ownerName" required maxLength={80} className={inputClass}/></label><label className="text-sm font-bold">Contact email<input name="email" type="email" required className={inputClass}/></label><label className="text-sm font-bold sm:col-span-2">Mobile number<input name="phone" type="tel" required placeholder="Include country code, e.g. +94…" className={inputClass}/></label><p className="text-xs leading-5 text-slate-500 sm:col-span-2">Contact details are visible to people browsing this public report so they can reach you.</p><div className="flex gap-3 pt-2 sm:col-span-2"><button type="button" onClick={() => { setImageData(""); setReportStatus(null); }} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600 hover:bg-slate-50">Cancel</button><button className="flex-1 rounded-xl bg-indigo-600 py-3 font-bold text-white hover:bg-indigo-700">Publish report</button></div></form></div></div>}

      {foundItem && <FoundDialog item={foundItem} onClose={() => setFoundItem(null)} onNotify={notifyOwner} onNotice={setNotice}/>}
    </main>
  );
}

function FoundDialog({ item, onClose, onNotify, onNotice }: { item: LostFoundItem; onClose: () => void; onNotify: (channel: "email" | "sms", contact: { phone: string; location: string }) => void; onNotice: (message: string) => void }) {
  const [foundContact, setFoundContact] = useState({ phone: "", location: "" });
  const [sharing, setSharing] = useState(false);
  function shareLocation() {
    if (!navigator.geolocation) { onNotice("Location sharing is not available in this browser."); return; }
    setSharing(true);
    navigator.geolocation.getCurrentPosition((position) => { setFoundContact((prev) => ({ ...prev, location: `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}` })); setSharing(false); onNotice("Your location is ready to share with the owner."); }, () => { setSharing(false); onNotice("Could not get your location. You can enter a place name instead."); }, { enableHighAccuracy: true, timeout: 12000 });
  }
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-black tracking-widest text-emerald-600">GREAT NEWS</p><h2 className="mt-1 text-2xl font-black">You found it?</h2><p className="mt-2 text-sm text-slate-500">Share a safe way for the owner to reach you about <strong className="text-slate-700">{item.name}</strong>.</p></div><button aria-label="Close" onClick={onClose} className="rounded-full bg-slate-100 p-2"><X size={18}/></button></div><label className="mt-5 block text-sm font-bold">Your mobile number<input value={foundContact.phone} onChange={(e) => setFoundContact({ ...foundContact, phone: e.target.value })} type="tel" placeholder="+94…" className={inputClass}/></label><label className="mt-4 block text-sm font-bold">Where did you find it?<input value={foundContact.location} onChange={(e) => setFoundContact({ ...foundContact, location: e.target.value })} placeholder="Place name or coordinates" className={inputClass}/></label><button onClick={shareLocation} disabled={sharing} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-indigo-600 disabled:opacity-50"><LocateFixed size={16}/>{sharing ? "Getting your location…" : "Share my current location"}</button><p className="mt-2 text-xs leading-5 text-slate-400">Your location and number will be added to a message for the owner. Review and send it in your email or messaging app.</p><div className="mt-6 grid grid-cols-2 gap-3"><button disabled={!item.email} onClick={() => onNotify("email", foundContact)} className="rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">Email owner</button><button disabled={!item.phone} onClick={() => onNotify("sms", foundContact)} className="rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Text owner</button></div>{!item.email && !item.phone && <p className="mt-3 text-center text-xs text-slate-400">This report has no contact details. Try another item.</p>}<button onClick={onClose} className="mt-4 flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-slate-400"><ArrowLeft size={14}/> Back to reports</button></div></div>;
}
