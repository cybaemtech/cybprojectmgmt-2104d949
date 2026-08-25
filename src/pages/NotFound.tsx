import React from "react";
import { AlertCircle, ExternalLink, ArrowRight } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4 font-sans">
      <div className="max-w-md w-full text-center bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={32} />
        </div>
        
        <div className="inline-block px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
          404 - Error Page Not Found
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Site Paused
        </h1>

        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          This site is currently paused. Please visit our official platform at the link below.
        </p>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 text-left">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
            Valid Platform Link
          </div>
          <a 
            href="https://www.cybaemnova.com/" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 font-medium text-sm break-all flex items-center justify-between group transition-colors"
          >
            <span>https://www.cybaemnova.com/</span>
            <ExternalLink size={14} className="text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform flex-shrink-0 ml-2" />
          </a>
        </div>

        <a 
          href="https://www.cybaemnova.com/" 
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-cyan-500/20 transition-all text-sm"
        >
          <span>Go to Cybaem Nova</span>
          <ArrowRight size={16} />
        </a>
      </div>
    </div>
  );
};

export default NotFound;
