import Link from "next/link";
import { Search, LogIn, ChevronDown } from "lucide-react";
import { GENRE_MAP } from "@/lib/api/jikan";

const GENRE_ENTRIES = Object.entries(GENRE_MAP);

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-md px-4 lg:px-8 h-16 flex items-center gap-4">
      <div className="flex items-center gap-8 flex-1">
        <Link
          href="/"
          className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-r from-purple-400 via-pink-500 to-amber-400"
        >
          Ani<span className="text-neutral-100">Watch</span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-neutral-400">
          <div className="relative group">
            <button className="hover:text-purple-400 transition-colors flex items-center gap-1.5">
              Genres <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            <div className="absolute left-0 top-full mt-2 hidden min-w-56 rounded-xl border border-neutral-800 bg-neutral-950/95 p-2 shadow-xl backdrop-blur-md group-hover:block">
              <div className="grid grid-cols-2 gap-1 text-xs font-semibold text-neutral-300">
                {GENRE_ENTRIES.map(([slug, g]) => (
                  <Link
                    key={slug}
                    href={`/genre/${slug}`}
                    className="rounded-lg px-2 py-1.5 hover:bg-neutral-900 hover:text-purple-400 transition-colors"
                  >
                    {g.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="relative group">
            <button className="hover:text-purple-400 transition-colors flex items-center gap-1.5">
              Types <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            <div className="absolute left-0 top-full mt-2 hidden min-w-45 rounded-xl border border-neutral-800 bg-neutral-950/95 p-2 shadow-xl backdrop-blur-md group-hover:block">
              <div className="grid gap-1 text-xs font-semibold text-neutral-300">
                {["tv", "movie", "ova", "special"].map((type) => (
                  <Link
                    key={type}
                    href={`/search?q=&type=${type}`}
                    className="rounded-lg px-2 py-1.5 hover:bg-neutral-900 hover:text-purple-400 transition-colors"
                  >
                    {type.toUpperCase()}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link
            href="/popular"
            className="hover:text-purple-400 transition-colors flex items-center gap-1.5"
          >
            Popular
          </Link>
        </nav>
      </div>

      <div className="flex-1 flex justify-center">
        <form
          action="/search"
          method="get"
          className="w-full max-w-md relative hidden sm:block"
        >
          <input
            type="text"
            name="q"
            placeholder="Search anime title, genres..."
            className="w-full bg-neutral-900 border border-neutral-800 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 rounded-full pl-4 pr-10 py-1.5 text-sm text-neutral-200 placeholder-neutral-500 outline-none transition-all"
            aria-label="Search anime"
          />
          <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
        </form>
      </div>

      <div className="flex items-center gap-4 flex-1 justify-end">
        <button className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all">
          <LogIn className="w-3.5 h-3.5 text-purple-400" /> Login
        </button>
      </div>
    </header>
  );
}
