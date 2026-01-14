export default function Home() {
  return (
    <div className="min-h-screen text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center mb-16 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-12">
            <h1 className="font-serif text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-teal-400 to-teal-600 bg-clip-text text-transparent">
                DB Truth Auditor
              </span>
            </h1>
            <p className="text-xl text-gray-200 mb-8">
              Production-ready database integrity auditing for Railway Postgres
            </p>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Connect any Railway Postgres database and get comprehensive reports on data quality,
              source of truth conflicts, and actionable fix plans with safety ratings.
            </p>

            <div className="mt-10">
              <Link
                href="/connect"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#139187] to-[#0d6b63] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-teal-900/20 transition-all transform hover:-translate-y-0.5"
              >
                Connect Database
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="p-3 bg-teal-500/20 rounded-xl w-fit mb-4">
                <Search className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">General Detection</h3>
              <p className="text-gray-400">
                Detects orphans, duplicates, missing constraints, type mismatches, and metric divergence risks
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="p-3 bg-teal-500/20 rounded-xl w-fit mb-4">
                <CheckCircle2 className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Confidence Scoring</h3>
              <p className="text-gray-400">
                Every issue includes confidence scores (0.0-1.0) and detection methods (HEURISTIC/CONSTRAINT/DATA_EVIDENCE)
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="p-3 bg-teal-500/20 rounded-xl w-fit mb-4">
                <ShieldCheck className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Safety Ratings</h3>
              <p className="text-gray-400">
                All SQL fixes tagged as SAFE, RISKY, or DESTRUCTIVE to prevent accidental data loss
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="p-3 bg-teal-500/20 rounded-xl w-fit mb-4">
                <Activity className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI-Powered Fixes</h3>
              <p className="text-gray-400">
                OpenAI generates migration scripts, backfills, verification queries, and app code recommendations
              </p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold mb-6 text-white">Quick Start</h2>
            <div className="grid gap-4">
              {[
                "Set up your Railway Postgres database for the tool (DATABASE_URL)",
                "Configure OPENAI_API_KEY and ENCRYPTION_KEY in environment variables",
                "Create a READ-ONLY user in your target database",
                "Connect your database and start auditing"
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                  <span className="bg-teal-500/20 text-teal-400 rounded-full w-8 h-8 flex items-center justify-center font-bold border border-teal-500/30">
                    {i + 1}
                  </span>
                  <span className="text-gray-300">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center text-gray-500 text-sm pt-8">
            <p>Built with Next.js 14, Prisma, OpenAI, and PostgreSQL</p>
            <p className="mt-2 text-gray-600">All connections encrypted • Read-only access • No auto-execution of fixes</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Search, CheckCircle2, ShieldCheck, Activity, ArrowRight } from 'lucide-react';
import Link from 'next/link';
