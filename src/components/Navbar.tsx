import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { GENRE_MAP, TYPE_MAP } from "@/lib/api/jikan";
import SearchBar from "@/components/SearchBar";
import AuthButton from "@/components/AuthButton";

const GENRE_ENTRIES = Object.entries(GENRE_MAP);
const TYPE_ENTRIES = Object.entries(TYPE_MAP);

function NavDropdown({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group">
      <button className="hover:text-purple-400 transition-colors flex items-center gap-1.5 py-5">
        {label} <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>
      <div className="absolute left-0 top-full hidden group-hover:block">
        <div className="h-1 w-full" />
        <div className="min-w-40 rounded-xl border border-neutral-800 bg-neutral-950/95 p-2 shadow-xl backdrop-blur-md">
          {children}
        </div>
      </div>
    </div>
  );
}

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
          <NavDropdown label="Genres">
            <div className="grid grid-cols-2 gap-1 text-xs font-semibold text-neutral-300 w-56">
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
          </NavDropdown>

          <NavDropdown label="Types">
            <div className="grid gap-1 text-xs font-semibold text-neutral-300 w-36">
              {TYPE_ENTRIES.map(([slug, t]) => (
                <Link
                  key={slug}
                  href={`/type/${slug}`}
                  className="rounded-lg px-2 py-1.5 hover:bg-neutral-900 hover:text-purple-400 transition-colors"
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </NavDropdown>

          <Link href="/popular" className="hover:text-purple-400 transition-colors">
            Popular
          </Link>
        </nav>
      </div>

      <div className="flex-1 flex justify-center">
        <SearchBar />
      </div>

      <div className="flex items-center gap-4 flex-1 justify-end">
        <AuthButton />
      </div>
    </header>
  );
}
