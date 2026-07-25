"use client";

import { useState } from "react";
import Image from "next/image";
import { useChat } from "./ChatContext";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { openChat } = useChat();

  const handleOpenChat = () => {
    setMobileMenuOpen(false);
    openChat(true);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <a href="#" className="flex items-center gap-3">
          <Image src="/jedco-logo.png" alt="JEDCO" width={40} height={40} className="h-10 w-auto" />
          <span className="text-lg font-bold text-jedco hidden sm:inline">JEDCO Services S.A.</span>
        </a>
        <div className="flex items-center gap-3">
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#services" className="hover:text-jedco transition">Services</a>
            <a href="#chiffres" className="hover:text-jedco transition">Chiffres</a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleOpenChat();
              }}
              className="hover:text-jedco transition"
            >
              Assistant
            </a>
            <a href="#contact" className="hover:text-jedco transition">Contact</a>
          </nav>
          <a
            href="#contact"
            className="hidden sm:inline-block rounded-lg bg-jedco px-5 py-2.5 text-sm font-semibold text-white hover:bg-jedco-light transition"
          >
            Demander un devis
          </a>
          <button
            type="button"
            aria-label="Ouvrir le menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-3 text-sm font-medium text-slate-700">
            <a href="#services" onClick={() => setMobileMenuOpen(false)} className="rounded-md px-2 py-1 hover:bg-slate-100">Services</a>
            <a href="#chiffres" onClick={() => setMobileMenuOpen(false)} className="rounded-md px-2 py-1 hover:bg-slate-100">Chiffres</a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleOpenChat();
              }}
              className="rounded-md px-2 py-1 hover:bg-slate-100"
            >
              Assistant
            </a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="rounded-md px-2 py-1 hover:bg-slate-100">Contact</a>
          </div>
        </div>
      )}
    </header>
  );
}
