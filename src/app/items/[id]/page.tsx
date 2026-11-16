"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";

type Item = { id: string; name: string; category: string; location: string; address?: string; image?: string; date: string; status: "Lost" | "Found"; description: string; ownerName: string; email: string; phone: string; lat?: number; lng?: number };

const samples: Item[] = [
  { id: "sample-wallet", name: "Black leather wallet", category: "Wallet", location: "Colombo, Sri Lanka", date: "Today", status: "Lost", description: "Black bifold wallet with cards inside. Please contact me if found.", ownerName: "Nimal", email: "", phone: "" },
  { id: "sample-keys", name: "Set of house keys", category: "Other", location: "Negombo, Sri Lanka", date: "Today", status: "Found", description: "Found near the bus station. Key ring has a blue tag.", ownerName: "Amaya", email: "", phone: "" },
  { id: "sample-headphones", name: "Wireless headphones", category: "Electronics", location: "Gampaha, Sri Lanka", date: "Yesterday", status: "Lost", description: "Over-ear headphones in a dark case.", ownerName: "Kasun", email: "", phone: "" },
];

export default function ItemPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved: Item[] = JSON.parse(localStorage.getItem("whereisit-items-v1") || "[]");
      setItem([...saved, ...samples].find((entry) => entry.id === params.id) || null);
    } catch { setItem(samples.find((entry) => entry.id === params.id) || null); }
    setLoaded(true);
  }, [params.id]);

  if (!loaded) return <main className="min-h-screen bg-[#f7f8fc] p-8 text-center text-slate-500">Loading item…</main>;
  if (!item) return <main className="min-h-screen bg-[#f7f8fc] p-8 text-center"><p className="text-xl font-bold">Item not found</p><Link href="/browse" className="mt-4 inline-block text-indigo-600">Back to browse</Link></main>;

  const destination = item.lat != null && item.lng != null ? `${item.lat},${item.lng}` : item.address || item.location;
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(destination)}&output=embed`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;

  return <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
    <nav className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8"><Link href="/" className="text-2xl font-black tracking-tight">WhereIsIt<span className="text-indigo-600">.</span></Link><Link href="/browse" className="text-sm font-bold text-indigo-600">Browse items</Link></div></nav>
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
      <Link href="/browse" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600"><ArrowLeft size={16}/> Back to items</Link>
      <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">{item.image ? <img src={item.image} alt={item.name} className="max-h-[360px] w-full bg-slate-100 object-contain"/> : <div className="flex h-48 items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-100 text-sm font-semibold text-slate-400">No photo was added to this report</div>}<div className="p-6 md:p-8"><span className={`rounded-full px-3 py-1 text-xs font-black ${item.status === "Lost" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{item.status}</span><p className="mt-6 text-xs font-black uppercase tracking-widest text-indigo-600">{item.category}</p><h1 className="mt-2 text-3xl font-black">{item.name}</h1><p className="mt-4 leading-7 text-slate-600">{item.description}</p><div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-600"><p><span className="font-bold text-slate-800">Reported by:</span> {item.ownerName}</p><p className="flex items-start gap-2"><MapPin size={17} className="mt-0.5 shrink-0 text-indigo-600"/><span><span className="font-bold text-slate-800">Area:</span> {item.location}{item.address && <span className="mt-1 block"><span className="font-bold text-slate-800">Address / landmark:</span> {item.address}</span>}{item.lat != null && item.lng != null && <span className="mt-1 block text-xs text-emerald-700">Exact coordinates shared by reporter</span>}</span></p><p><span className="font-bold text-slate-800">Date:</span> {item.date}</p></div>{item.email && <a href={`mailto:${item.email}?subject=${encodeURIComponent(`About your ${item.status.toLowerCase()} item: ${item.name}`)}`} className="mt-7 block rounded-xl bg-indigo-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-indigo-700">Contact reporter by email</a>}{item.phone && <a href={`sms:${item.phone}`} className="mt-3 block rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50">Text reporter</a>}</div></section>
        <section><div className="mb-3"><p className="text-xs font-black tracking-widest text-indigo-600">ITEM LOCATION</p><h2 className="mt-1 text-xl font-black">Map view</h2><p className="mt-1 text-sm text-slate-500">{item.lat != null && item.lng != null ? "Map centered on the exact coordinates shared by the reporter." : "Map centered on the reported place. The marker may be approximate."}</p></div><div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm"><iframe title={`Map showing ${item.name} location`} src={embedUrl} className="h-[420px] w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen/></div><a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-bold text-indigo-600 hover:text-indigo-800">Open this location in Google Maps ↗</a></section>
      </div>
    </div>
  </main>;
}
