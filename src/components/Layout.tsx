import React from 'react';
import { motion } from 'motion/react';
import Navbar from './Navbar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-grow pt-20 md:pt-24 pb-8 md:pb-12 px-4 md:px-6 max-w-7xl mx-auto w-full"
      >
        {children}
      </motion.main>
      <footer className="py-12 border-t border-[#D9C5A0]/20 text-center text-[#2D3436]/50 text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2026 PSMastery. Refined Photoshop Education for BSIT Students.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#427AB5] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#427AB5] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#427AB5] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
