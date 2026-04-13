import React, { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight } from "lucide-react";
import { WorkItem, Project } from "@/types/schema";

type TimeUnit = "Quarter" | "Month" | "Week";

interface TimelineViewProps {
  projectId?: number;
  workItems: WorkItem[];
  timeUnit?: TimeUnit;
  onTimeUnitChange?: (unit: TimeUnit) => void;
  projects?: Project[];
  multiProject?: boolean;
}

// ── Period helpers ──────────────────────────────────────────────────────

interface Period {
  label: string;
  start: Date;
  end: Date;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildPeriods(unit: TimeUnit): Period[] {
  const today = new Date();
  const periods: Period[] = [];

  if (unit === "Quarter") {
    const curQ = Math.floor(today.getMonth() / 3);
    const curY = today.getFullYear();
    for (let i = 0; i < 8; i++) {
      const q = (curQ + i) % 4;
      const y = curY + Math.floor((curQ + i) / 4);
      const start = new Date(y, q * 3, 1);
      const end = new Date(y, q * 3 + 3, 1);
      periods.push({ label: `Q${q + 1} ${y}`, start, end });
    }
  } else if (unit === "Month") {
    const curM = today.getMonth();
    const curY = today.getFullYear();
    for (let i = 0; i < 12; i++) {
      const m = (curM + i) % 12;
      const y = curY + Math.floor((curM + i) / 12);
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 1);
      periods.push({ label: `${MONTH_NAMES[m]} ${y}`, start, end });
    }
  } else {
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const thisMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset);
    for (let i = 0; i < 12; i++) {
      const start = new Date(thisMonday);
      start.setDate(thisMonday.getDate() + i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      periods.push({ label: `${start.getDate()} ${MONTH_NAMES[start.getMonth()]}`, start, end });
    }
  }
  return periods;
}

function getBarPosition(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  periods: Period[]
): { leftPercent: number; widthPercent: number } | null {
  if (!startDate && !endDate) return null;

  const rangeStart = periods[0].start.getTime();
  const rangeEnd = periods[periods.length - 1].end.getTime();
  const totalRange = rangeEnd - rangeStart;
  if (totalRange <= 0) return null;

  const itemStart = startDate ? new Date(startDate).getTime() : rangeStart;
  const itemEnd = endDate ? new Date(endDate).getTime() : itemStart + 86400000;

  // Clamp to visible range
  const clampedStart = Math.max(itemStart, rangeStart);
  const clampedEnd = Math.min(itemEnd, rangeEnd);
  if (clampedStart >= clampedEnd) return null;

  const leftPercent = ((clampedStart - rangeStart) / totalRange) * 100;
  const widthPercent = ((clampedEnd - clampedStart) / totalRange) * 100;

  return { leftPercent, widthPercent: Math.max(widthPercent, 1) };
}

function getTodayPosition(periods: Period[]): number | null {
  const now = Date.now();
  const rangeStart = periods[0].start.getTime();
  const rangeEnd = periods[periods.length - 1].end.getTime();
  if (now < rangeStart || now > rangeEnd) return null;
  return ((now - rangeStart) / (rangeEnd - rangeStart)) * 100;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

// ── Sub-components ─────────────────────────────────────────────────────

interface TimelineHeaderProps {
  periods: Period[];
}

function TimelineHeader({ periods }: TimelineHeaderProps) {
  const todayPos = getTodayPosition(periods);
  return (
    <div className="relative h-10 border-b border-neutral-200">
      <div className="flex h-full">
        {periods.map((p, i) => (
          <div
            key={i}
            className="flex-1 text-xs font-medium text-neutral-500 flex items-center justify-center border-r border-neutral-100 last:border-r-0"
          >
            {p.label}
          </div>
        ))}
      </div>
      {todayPos !== null && (
        <div
          className="absolute top-0 bottom-0 w-px border-l-2 border-dashed border-red-400 z-10 pointer-events-none"
          style={{ left: `${todayPos}%` }}
        />
      )}
    </div>
  );
}

interface TimelineBarProps {
  name: string;
  startDate: string | Date | null | undefined;
  endDate: string | Date | null | undefined;
  periods: Period[];
  color: string;
  textColor: string;
  height: string;
  isEpic?: boolean;
}

function TimelineBar({ name, startDate, endDate, periods, color, textColor, height, isEpic }: TimelineBarProps) {
  const pos = getBarPosition(startDate, endDate, periods);
  const todayPos = getTodayPosition(periods);

  if (!pos) {
    return (
      <div className="relative h-full flex items-center">
        {todayPos !== null && (
          <div
            className="absolute top-0 bottom-0 w-px border-l-2 border-dashed border-red-400 z-10 pointer-events-none"
            style={{ left: `${todayPos}%` }}
          />
        )}
        {/* Grid lines */}
        <div className="absolute inset-0 flex pointer-events-none">
          {periods.map((_, i) => (
            <div key={i} className="flex-1 border-r border-neutral-100 last:border-r-0" />
          ))}
        </div>
        <div
          className="absolute border border-dashed border-neutral-300 rounded bg-neutral-50 flex items-center justify-center px-2"
          style={{ left: "2%", width: "20%", height }}
        >
          <span className="text-xs text-neutral-400 truncate">Not Scheduled</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative h-full flex items-center">
            {todayPos !== null && (
              <div
                className="absolute top-0 bottom-0 w-px border-l-2 border-dashed border-red-400 z-10 pointer-events-none"
                style={{ left: `${todayPos}%` }}
              />
            )}
            {/* Grid lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {periods.map((_, i) => (
                <div key={i} className="flex-1 border-r border-neutral-100 last:border-r-0" />
              ))}
            </div>
            <div
              className={`absolute rounded-md flex items-center px-2 transition-all duration-300 ease-in-out cursor-pointer shadow-sm ${color}`}
              style={{
                left: `${pos.leftPercent}%`,
                width: `${pos.widthPercent}%`,
                height,
              }}
            >
              <span className={`text-xs font-medium truncate ${textColor}`}>
                {isEpic ? name : name}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-semibold text-sm">{name}</p>
          <p className="text-xs text-neutral-500 mt-1">
            {formatDate(startDate)} → {formatDate(endDate)}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface EpicRowProps {
  epic: WorkItem;
  features: WorkItem[];
  periods: Period[];
  isExpanded: boolean;
  onToggle: () => void;
  rowIndex: number;
}

function EpicRow({ epic, features, periods, isExpanded, onToggle, rowIndex }: EpicRowProps) {
  const bgClass = rowIndex % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]";

  return (
    <>
      {/* Epic row */}
      <div
        className={`flex min-h-[48px] group hover:bg-[#EFF6FF] transition-colors cursor-pointer ${bgClass}`}
        onClick={onToggle}
      >
        {/* Left panel */}
        <div className="w-[280px] flex-shrink-0 flex items-center px-4 border-r border-neutral-200">
          <button className="mr-2 text-neutral-400 hover:text-neutral-700 transition-colors flex-shrink-0">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0">
            E
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900 truncate">{epic.title}</p>
            <p className="text-xs text-neutral-400">{epic.externalId}</p>
          </div>
        </div>
        {/* Right panel - bar */}
        <div className="flex-1 relative">
          <TimelineBar
            name={epic.title}
            startDate={epic.startDate}
            endDate={epic.endDate}
            periods={periods}
            color="bg-blue-500"
            textColor="text-white"
            height="28px"
            isEpic
          />
        </div>
      </div>

      {/* Feature rows */}
      {isExpanded &&
        features.map((feature, fi) => (
          <FeatureRow
            key={feature.id}
            feature={feature}
            periods={periods}
            rowIndex={rowIndex + fi + 1}
          />
        ))}
    </>
  );
}

interface FeatureRowProps {
  feature: WorkItem;
  periods: Period[];
  rowIndex: number;
}

function FeatureRow({ feature, periods, rowIndex }: FeatureRowProps) {
  const bgClass = rowIndex % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]";

  return (
    <div className={`flex min-h-[40px] group hover:bg-[#EFF6FF] transition-colors ${bgClass}`}>
      {/* Left panel */}
      <div className="w-[280px] flex-shrink-0 flex items-center pl-12 pr-4 border-r border-neutral-200">
        <div className="w-5 h-5 rounded bg-neutral-200 flex items-center justify-center text-neutral-600 text-xs font-bold mr-2 flex-shrink-0">
          F
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-800 truncate">{feature.title}</p>
          <p className="text-xs text-neutral-400">{feature.externalId}</p>
        </div>
      </div>
      {/* Right panel - bar */}
      <div className="flex-1 relative">
        <TimelineBar
          name={feature.title}
          startDate={feature.startDate}
          endDate={feature.endDate}
          periods={periods}
          color="bg-blue-200"
          textColor="text-blue-900"
          height="20px"
        />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export function TimelineView({
  workItems,
  timeUnit = "Quarter",
  onTimeUnitChange,
}: TimelineViewProps) {
  const [expandedEpics, setExpandedEpics] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const epics = useMemo(() => workItems.filter(item => item.type === "EPIC"), [workItems]);
  const features = useMemo(() => workItems.filter(item => item.type === "FEATURE"), [workItems]);
  const periods = useMemo(() => buildPeriods(timeUnit), [timeUnit]);

  // Start with all expanded
  React.useEffect(() => {
    setExpandedEpics(new Set(epics.map(e => e.id)));
  }, [epics]);

  const toggleEpic = (epicId: number) => {
    setExpandedEpics(prev => {
      const next = new Set(prev);
      if (next.has(epicId)) next.delete(epicId);
      else next.add(epicId);
      return next;
    });
  };

  const getFeaturesForEpic = (epicId: number) =>
    features.filter(f => f.parentId === epicId);

  let runningRowIndex = 0;

  return (
    <Card className="bg-white shadow-sm border border-neutral-200 overflow-hidden">
      <CardHeader className="px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-neutral-900">
            Epics & Features Timeline
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-500">Timeline View:</span>
            <Select value={timeUnit} onValueChange={(v) => onTimeUnitChange?.(v as TimeUnit)}>
              <SelectTrigger className="bg-white border border-neutral-300 text-neutral-700 rounded-md h-8 w-28 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Week">Week</SelectItem>
                <SelectItem value="Month">Month</SelectItem>
                <SelectItem value="Quarter">Quarter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {epics.length === 0 ? (
          <p className="text-sm text-neutral-400 p-6">No epics found for this project.</p>
        ) : (
          <div className="flex overflow-hidden">
            {/* Fixed left panel header */}
            <div className="w-[280px] flex-shrink-0">
              <div className="h-10 border-b border-neutral-200 flex items-center px-4">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  Work Items
                </span>
              </div>
            </div>
            {/* Scrollable right panel header */}
            <div className="flex-1 overflow-x-auto" ref={scrollRef}>
              <div style={{ minWidth: `${periods.length * 100}px` }}>
                <TimelineHeader periods={periods} />
              </div>
            </div>
          </div>
        )}

        {epics.length > 0 && (
          <div className="flex overflow-hidden">
            {/* Left panel rows (synced scroll) */}
            <div className="w-[280px] flex-shrink-0 overflow-hidden">
              {epics.map(epic => {
                const epicFeatures = getFeaturesForEpic(epic.id);
                const isExpanded = expandedEpics.has(epic.id);
                const epicRowIndex = runningRowIndex;
                runningRowIndex += 1 + (isExpanded ? epicFeatures.length : 0);

                return (
                  <React.Fragment key={epic.id}>
                    {/* Epic left panel */}
                    <div
                      className={`flex min-h-[48px] items-center px-4 border-b border-neutral-100 cursor-pointer group hover:bg-[#EFF6FF] transition-colors ${
                        epicRowIndex % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]"
                      }`}
                      onClick={() => toggleEpic(epic.id)}
                    >
                      <button className="mr-2 text-neutral-400 hover:text-neutral-700 flex-shrink-0">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0">
                        E
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 truncate">{epic.title}</p>
                        <p className="text-xs text-neutral-400">{epic.externalId}</p>
                      </div>
                    </div>
                    {isExpanded &&
                      epicFeatures.map((feature, fi) => (
                        <div
                          key={feature.id}
                          className={`flex min-h-[40px] items-center pl-12 pr-4 border-b border-neutral-100 group hover:bg-[#EFF6FF] transition-colors ${
                            (epicRowIndex + fi + 1) % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]"
                          }`}
                        >
                          <div className="w-5 h-5 rounded bg-neutral-200 flex items-center justify-center text-neutral-600 text-xs font-bold mr-2 flex-shrink-0">
                            F
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-neutral-800 truncate">{feature.title}</p>
                            <p className="text-xs text-neutral-400">{feature.externalId}</p>
                          </div>
                        </div>
                      ))}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Right panel bars */}
            <div
              className="flex-1 overflow-x-auto"
              onScroll={(e) => {
                if (scrollRef.current) {
                  scrollRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
                }
              }}
            >
              <div style={{ minWidth: `${periods.length * 100}px` }}>
                {(() => {
                  let idx = 0;
                  return epics.map(epic => {
                    const epicFeatures = getFeaturesForEpic(epic.id);
                    const isExpanded = expandedEpics.has(epic.id);
                    const epicIdx = idx;
                    idx += 1 + (isExpanded ? epicFeatures.length : 0);

                    return (
                      <React.Fragment key={epic.id}>
                        <div
                          className={`min-h-[48px] border-b border-neutral-100 hover:bg-[#EFF6FF] transition-colors ${
                            epicIdx % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]"
                          }`}
                        >
                          <TimelineBar
                            name={epic.title}
                            startDate={epic.startDate}
                            endDate={epic.endDate}
                            periods={periods}
                            color="bg-blue-500"
                            textColor="text-white"
                            height="28px"
                            isEpic
                          />
                        </div>
                        {isExpanded &&
                          epicFeatures.map((feature, fi) => (
                            <div
                              key={feature.id}
                              className={`min-h-[40px] border-b border-neutral-100 hover:bg-[#EFF6FF] transition-colors ${
                                (epicIdx + fi + 1) % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]"
                              }`}
                            >
                              <TimelineBar
                                name={feature.title}
                                startDate={feature.startDate}
                                endDate={feature.endDate}
                                periods={periods}
                                color="bg-blue-200"
                                textColor="text-blue-900"
                                height="20px"
                              />
                            </div>
                          ))}
                      </React.Fragment>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
