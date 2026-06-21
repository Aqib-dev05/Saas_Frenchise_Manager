export default function Table({ columns, data, emptyText = 'No data found' }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {columns.map(col => (
              <th key={col.key} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="text-center text-gray-400 py-12">{emptyText}</td></tr>
          ) : data.map((row, i) => (
            <tr key={row.id || i} className="hover:bg-gray-50/50 transition-colors">
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3 text-gray-700">
                  {col.render ? col.render(row) : row[col.key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
