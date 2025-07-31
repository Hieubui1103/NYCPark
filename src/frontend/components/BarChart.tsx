import React, { useState, useMemo } from "react";
import Plot from "react-plotly.js";
import type { Data } from "plotly.js";

export interface ParkBarData {
  name: string;
  acres: number;
}

interface Props {
  data: ParkBarData[];
  height?: number;
}

const entryOptions = [10, 25, 50, 100, 'All'] as const;
type EntryOption = typeof entryOptions[number];

const BarChart: React.FC<Props> = ({ data, height = 400 }) => {
  const [entries, setEntries] = useState<EntryOption>(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Sort by acres descending
//   const sorted = useMemo(() => {
//     const arr = [...data];
//     // arr.sort((a, b) => b.acres - a.acres);
//     return arr;
//   }, [data]);
  const sorted = data
  // Pagination logic
  const totalPages = useMemo(() => {
    if (entries === 'All') return 1;
    return Math.ceil(sorted.length / entries);
  }, [sorted.length, entries]);

  const startIndex = useMemo(() => {
    if (entries === 'All') return 0;
    return (currentPage - 1) * entries;
  }, [currentPage, entries]);

  const endIndex = useMemo(() => {
    if (entries === 'All') return sorted.length;
    return Math.min(startIndex + entries, sorted.length);
  }, [startIndex, entries, sorted.length]);

  const showData = useMemo(() => {
    if (entries === 'All') return sorted;
    return sorted.slice(startIndex, endIndex);
  }, [sorted, startIndex, endIndex, entries]);

  // Reset to page 1 when entries change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [entries]);

  const names: string[] = showData.map(d => d.name);
  const acres: number[] = showData.map(d => d.acres);

  const handlePrevious = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mt-8">
      <h2 className="text-2xl font-bold text-center mb-2">Open Space Acres by Public Open Space Name (Bar Chart)</h2>
      <div className="w-full flex flex-row items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="text-xs mr-2">Show</div>
          <select
            className="border rounded px-2 py-1 text-xs"
            value={entries}
            onChange={e => setEntries(e.target.value === 'All' ? 'All' : Number(e.target.value) as EntryOption)}
          >
            {entryOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <div className="text-xs ml-2">entries</div>
        </div>
        {/* Remove pagination controls from here */}
      </div>
      
      <Plot
        data={[
          {
            type: "bar",
            x: acres,
            y: names,
            orientation: "h",
            marker: { color: "#4682b4" },
            hovertemplate: "%{y}<br>Acres: %{x}<extra></extra>",
            name: "Total Open Space Acres",
          } as Partial<Data>
        ]}
        layout={{
          height: height,
          margin: { l: 120, r: 40, t: 30, b: 40 },
          xaxis: {
            title: {
              text: "Total Open Space Acres",
              font: { size: 14, family: "Arial"}
            },
            automargin: true,
            zeroline: false,
            showgrid: true,
            tickfont: { size: 12, family: "Arial" },
          },
          yaxis: {
            title: {
              text: "Public Open Space Name",
              font: { size: 14, family: "Arial"}
            },
            automargin: true,
            tickfont: { size: 12, family: "Arial"}
          },
          bargap: 0.2,
          plot_bgcolor: "#fff",
          paper_bgcolor: "#fff",
        }}
        config={{ responsive: true, displayModeBar: true }}
        style={{ width: "100%", minHeight: height }}
      />
      <div className="text-xs text-gray-600 mt-2">[1] "Click on a bar to view details."</div>
      
      {/* Table below the chart */}
      <div className="w-full mt-6">
        <table className="min-w-full border text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1 border">#</th>
              <th className="px-2 py-1 border text-left">PUBLIC OPEN SPACE NAME</th>
              <th className="px-2 py-1 border text-right">OPEN SPACE ACRES</th>
            </tr>
          </thead>
          <tbody>
            {showData.map((row, i) => (
              <tr key={row.name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="px-2 py-1 border text-center">{startIndex + i + 1}</td>
                <td className="px-2 py-1 border text-left">{row.name}</td>
                <td className="px-2 py-1 border text-right">{row.acres.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-row justify-between items-center mt-1">
          <div className="text-xs text-gray-600">
            Showing {startIndex + 1} to {endIndex} of {sorted.length} entries
          </div>
          {/* Pagination Controls - bottom right */}
          {entries !== 'All' && totalPages > 1 && (
            <div className="flex items-center space-x-1 select-none">
              <button
                onClick={handlePrevious}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs  disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>
              {/* Page Numbers with ellipsis */}
              {(() => {
                const pages = [];
                const showLeftEllipsis = currentPage > 4;
                const showRightEllipsis = currentPage < totalPages - 3;
                // Always show first page
                pages.push(
                  <button
                    key={1}
                    onClick={() => handlePageClick(1)}
                    className={`px-2 py-1 text-xs  ${currentPage === 1 ? 'bg-gray-200 border-gray-400 font-bold' : 'hover:bg-gray-100'}`}
                  >
                    1
                  </button>
                );
                // Left ellipsis
                if (showLeftEllipsis) {
                  pages.push(<span key="left-ellipsis" className="px-1">...</span>);
                }
                // Pages around current
                const start = Math.max(2, currentPage - 2);
                const end = Math.min(totalPages - 1, currentPage + 2);
                for (let i = start; i <= end; i++) {
                  if (i === 1 || i === totalPages) continue;
                  pages.push(
                    <button
                      key={i}
                      onClick={() => handlePageClick(i)}
                      className={`px-2 py-1 text-xs  ${currentPage === i ? 'bg-gray-200 font-bold border-gray-400' : 'hover:bg-gray-100'}`}
                    >
                      {i}
                    </button>
                  );
                }
                // Right ellipsis
                if (showRightEllipsis) {
                  pages.push(<span key="right-ellipsis" className="px-1">...</span>);
                }
                // Always show last page if more than 1
                if (totalPages > 1) {
                  pages.push(
                    <button
                      key={totalPages}
                      onClick={() => handlePageClick(totalPages)}
                      className={`px-2 py-1 text-xs ${currentPage === totalPages ? 'bg-gray-200 border-gray-400 font-bold shadow-md' : 'hover:bg-gray-100'}`}
                    >
                      {totalPages}
                    </button>
                  );
                }
                return pages;
              })()}
              <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarChart;
