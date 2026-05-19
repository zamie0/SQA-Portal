"use client";

import {
  Fragment,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type WheelEvent,
} from "react";
import {
  formatTags,
  groupUatTestCasesByPart,
  uatTestCaseColumns,
  type UatTestCase,
} from "@/modules/tools/qa-genius/lib/uat-test-cases";

type UatTestCaseTableProps = {
  title: string;
  testCases: UatTestCase[];
};

const tableColumnWidths = [360, 120, 360, 420, 450, 450, 180, 140, 300, 260] as const;
const tableMinWidth = tableColumnWidths.reduce((total, width) => total + width, 0);

function columnStyle(index: number): CSSProperties {
  const width = tableColumnWidths[index] ?? 240;
  return {
    width,
    minWidth: width,
    maxWidth: width,
  };
}

function stepList(id: string, type: "step" | "expected", values: string[]) {
  return (
    <ol className="list-decimal space-y-1 pl-5">
      {values.map((value, index) => (
        <li key={`${id}-${type}-${index}`} className="pl-1">
          {value}
        </li>
      ))}
    </ol>
  );
}

export function UatTestCaseTable({ title, testCases }: UatTestCaseTableProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    scrollLeft: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  const groups = groupUatTestCasesByPart(testCases);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || !event.shiftKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

    event.preventDefault();
    viewport.scrollLeft += event.deltaY;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !viewportRef.current) return;

    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: viewportRef.current.scrollLeft,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    const drag = dragRef.current;

    if (!viewport || !drag.active || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    viewport.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (
      dragRef.current.pointerId === event.pointerId &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current.active = false;
    setIsDragging(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/60">
      <style>{`
        .qa-genius-table-scroll {
          scrollbar-color: #64748b #e2e8f0;
          scrollbar-width: auto;
        }

        .qa-genius-table-scroll::-webkit-scrollbar {
          height: 12px;
          width: 12px;
        }

        .qa-genius-table-scroll::-webkit-scrollbar-thumb {
          background: #64748b;
          border-radius: 9999px;
        }

        .qa-genius-table-scroll::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }

        .qa-genius-table-scroll::-webkit-scrollbar-track {
          background: #e2e8f0;
        }
      `}</style>
      <div
        ref={viewportRef}
        className={`qa-genius-table-scroll max-h-[600px] w-full max-w-full overflow-x-scroll overflow-y-scroll overscroll-contain pb-4 ${
          isDragging ? "cursor-grabbing select-none" : "cursor-grab"
        }`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <table
          className="table-fixed border-collapse text-left text-sm"
          style={{ width: tableMinWidth, minWidth: tableMinWidth }}
        >
          <colgroup>
            {uatTestCaseColumns.map((column, index) => (
              <col key={column} style={columnStyle(index)} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th
                colSpan={uatTestCaseColumns.length}
                className="sticky top-0 z-50 border border-emerald-800 bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
              >
                {title}
              </th>
            </tr>
            <tr className="bg-slate-900 text-white">
              {uatTestCaseColumns.map((column, index) => (
                <th
                  key={column}
                  className={`sticky top-[37px] z-20 border border-slate-700 bg-slate-900 px-3 py-3 align-top font-bold ${
                    index === 0 ? "whitespace-normal break-words" : "whitespace-nowrap"
                  }`}
                  style={columnStyle(index)}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.part}>
                <tr>
                  <td
                    colSpan={uatTestCaseColumns.length}
                    className="border border-emerald-800 bg-emerald-500 px-4 py-2 text-sm font-bold text-white"
                  >
                    Part: {group.part}
                  </td>
                </tr>
                {group.testCases.map((testCase, rowIndex) => {
                  const rowClass = rowIndex % 2 === 0 ? "bg-white/90" : "bg-slate-50/90";
                  const baseCellClass =
                    "overflow-hidden text-ellipsis border border-slate-300 px-3 py-3 align-top text-slate-800 whitespace-nowrap";
                  const wrappingCellClass =
                    "overflow-hidden border border-slate-300 px-3 py-3 align-top text-slate-800 whitespace-normal break-words";
                  const longTextCellClass =
                    "min-w-[300px] overflow-hidden border border-slate-300 px-3 py-3 align-top text-slate-800 whitespace-pre-line break-words";

                  return (
                    <tr key={testCase.tcId} className={rowClass}>
                      <td className={wrappingCellClass} style={columnStyle(0)}>
                        {testCase.jiraUserStorySummary}
                      </td>
                      <td
                        className={`${baseCellClass} font-semibold text-slate-900`}
                        style={columnStyle(1)}
                      >
                        {testCase.tcId}
                      </td>
                      <td
                        className={`${wrappingCellClass} font-medium text-slate-900`}
                        style={columnStyle(2)}
                      >
                        {testCase.testScenario}
                      </td>
                      <td className={baseCellClass} style={columnStyle(3)}>
                        {testCase.objective}
                      </td>
                      <td className={longTextCellClass} style={columnStyle(4)}>
                        {stepList(testCase.tcId, "step", testCase.testProcedure)}
                      </td>
                      <td className={longTextCellClass} style={columnStyle(5)}>
                        {stepList(testCase.tcId, "expected", testCase.expectedResults)}
                      </td>
                      <td className={`${baseCellClass} font-medium`} style={columnStyle(6)}>
                        {testCase.actualResults}
                      </td>
                      <td className={`${baseCellClass} font-medium`} style={columnStyle(7)}>
                        {testCase.priority}
                      </td>
                      <td className={baseCellClass} style={columnStyle(8)}>
                        {testCase.remarks}
                      </td>
                      <td className={baseCellClass} style={columnStyle(9)}>
                        {formatTags(testCase.tags)}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
