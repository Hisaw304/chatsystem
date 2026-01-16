import { useMemo } from "react";

export default function Dashboard() {
  // mock data (replace with API later)
  const sessions = [
    {
      id: 1,
      user: "Anonymous",
      minutes: 12,
      rate: 2,
      date: "2026-01-05",
    },
    {
      id: 2,
      user: "Anonymous",
      minutes: 5,
      rate: 2,
      date: "2026-01-04",
    },
  ];

  const totals = useMemo(() => {
    const minutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
    const earnings = sessions.reduce((sum, s) => sum + s.minutes * s.rate, 0);
    return { minutes, earnings };
  }, [sessions]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Chat Dashboard</h1>
          <p className="text-sm text-gray-500">
            Sessions, time spent, and earnings
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">Total Minutes</p>
            <p className="text-2xl font-bold">{totals.minutes}</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow">
            <p className="text-sm text-gray-500">Total Earnings</p>
            <p className="text-2xl font-bold">${totals.earnings.toFixed(2)}</p>
          </div>
        </div>

        {/* Sessions */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="font-medium">Recent Sessions</p>
          </div>

          {sessions.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No sessions yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Minutes</th>
                  <th className="p-3">Rate</th>
                  <th className="p-3">Earnings</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3">{s.user}</td>
                    <td className="p-3">{s.minutes}</td>
                    <td className="p-3">${s.rate}/min</td>
                    <td className="p-3 font-medium">
                      ${(s.minutes * s.rate).toFixed(2)}
                    </td>
                    <td className="p-3 text-gray-500">{s.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
