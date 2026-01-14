export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              DB Truth Auditor
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Production-ready database integrity auditing for Railway Postgres
            </p>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Connect any Railway Postgres database and get comprehensive reports on data quality,
              source of truth conflicts, and actionable fix plans with safety ratings.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
              <div className="text-3xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2">General Detection</h3>
              <p className="text-gray-400">
                Detects orphans, duplicates, missing constraints, type mismatches, and metric divergence risks
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">Confidence Scoring</h3>
              <p className="text-gray-400">
                Every issue includes confidence scores (0.0-1.0) and detection methods (HEURISTIC/CONSTRAINT/DATA_EVIDENCE)
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
              <div className="text-3xl mb-4">🛡️</div>
              <h3 className="text-xl font-semibold mb-2">Safety Ratings</h3>
              <p className="text-gray-400">
                All SQL fixes tagged as SAFE, RISKY, or DESTRUCTIVE to prevent accidental data loss
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Fixes</h3>
              <p className="text-gray-400">
                OpenAI generates migration scripts, backfills, verification queries, and app code recommendations
              </p>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-8 border border-gray-700 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
            <ol className="space-y-3 text-gray-300">
              <li className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">1</span>
                <span>Set up your Railway Postgres database for the tool (DATABASE_URL)</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">2</span>
                <span>Configure OPENAI_API_KEY and ENCRYPTION_KEY in environment variables</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">3</span>
                <span>Create a READ-ONLY user in your target database</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">4</span>
                <span>Connect your database and start auditing</span>
              </li>
            </ol>
          </div>

          <div className="text-center">
            <a
              href="/connect"
              className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-lg transition-all transform hover:scale-105"
            >
              Connect Database
            </a>
          </div>

          <div className="mt-16 text-center text-gray-500 text-sm">
            <p>Built with Next.js 14, Prisma, OpenAI, and PostgreSQL</p>
            <p className="mt-2">All connections encrypted • Read-only access • No auto-execution of fixes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
