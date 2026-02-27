'use client'

export default function GradesPage() {
  return (
    <div className="p-8">

      <div className="bg-white border border-gray-200 rounded-2xl p-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <div className="flex items-center justify-center space-x-2 mb-2">
            <h2 className="text-lg font-semibold text-black">Grades Page</h2>
            <div className="relative group">
              <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                View and manage trainee grades and assessments
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
              </div>
            </div>
          </div>
          <p className="text-gray-500">This is a blank grades page.</p>
          <p className="text-sm text-gray-400 mt-4">Features to be implemented:</p>
          <ul className="text-sm text-gray-400 mt-2 space-y-1">
            <li>• Grade book management</li>
            <li>• trainee grade reports</li>
            <li>• Grade calculations</li>
            <li>• Progress tracking</li>
            <li>• Export grade reports</li>
          </ul>
        </div>
      </div>
    </div>
  )
}