export default function StudentDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Student Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">My Courses</h3>
          <p className="text-sm text-gray-600">View enrolled courses</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Assignments</h3>
          <p className="text-sm text-gray-600">Submit assignments</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Grades</h3>
          <p className="text-sm text-gray-600">View your grades</p>
        </div>
      </div>
    </div>
  )
}