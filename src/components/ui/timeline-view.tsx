import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  start: Date; // inclusive
  end: Date;   // exclusive
}

function buildPeriods(unit: TimeUnit): Period[] {
  const today = new Date();
  const periods: Period[] = [];

  if (unit === "Quarter") {
    // Show 8 quarters: from start of current quarter
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
    // Show 12 months starting from current month
    const curM = today.getMonth();
    const curY = today.getFullYear();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 0; i < 12; i++) {
      const m = (curM + i) % 12;
      const y = curY + Math.floor((curM + i) / 12);
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 1);
      periods.push({ label: `${monthNames[m]} ${y}`, start, end });
    }
  } else {
    // Week: show 8 weeks starting from current week (Monday)
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const thisMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + mondayOffset);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 0; i < 8; i++) {
      const start = new Date(thisMonday);
      start.setDate(thisMonday.getDate() + i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      const label = `${start.getDate()} ${monthNames[start.getMonth()]}`;
      periods.push({ label, start, end });
    }
  }
  return periods;
}

function getPosition(item: WorkItem, periods: Period[]): { start: number; span: number } | null {
  if (!item.startDate && !item.endDate) return null; // no dates → will show as "no dates"

  const rangeStart = periods[0].start.getTime();
  const rangeEnd = periods[periods.length - 1].end.getTime();

  const itemStart = item.startDate ? new Date(item.startDate).getTime() : rangeStart;
  const itemEnd = item.endDate ? new Date(item.endDate).getTime() : itemStart;

  // If item is entirely outside the visible range, skip
  if (itemEnd < rangeStart || itemStart >= rangeEnd) return null;

  // Find the period index for start & end
  let startIdx = 0;
  let endIdx = periods.length - 1;

  for (let i = 0; i < periods.length; i++) {
    if (itemStart < periods[i].end.getTime()) {
      startIdx = i;
      break;
    }
  }
  for (let i = periods.length - 1; i >= 0; i--) {
    if (itemEnd >= periods[i].start.getTime()) {
      endIdx = i;
      break;
    }
  }

  if (startIdx < 0) startIdx = 0;
  if (endIdx >= periods.length) endIdx = periods.length - 1;
  const span = endIdx - startIdx + 1;

  return { start: startIdx, span: Math.max(1, span) };
}

// ── Component ──────────────────────────────────────────────────────────

export function TimelineView({
  projectId,
  workItems,
  timeUnit = "Quarter",
  onTimeUnitChange,
  projects = [],
  multiProject = false,
}: TimelineViewProps) {
  const epics = workItems.filter(item => item.type === "EPIC");
  const features = workItems.filter(item => item.type === "FEATURE");
  const periods = buildPeriods(timeUnit);

  const getFeaturesForEpic = (epicId: number) =>
    features.filter(f => f.parentId === epicId);

  const getProjectName = (pid: number | null) => {
    if (!pid || !multiProject) return null;
    return projects.find(p => p.id === pid)?.name ?? null;
  };

  const handleTimeUnitChange = (value: string) => {
    onTimeUnitChange?.(value as TimeUnit);
  };

  const colMinWidth = timeUnit === "Week" ? "90px" : "100px";
  const gridCols = `repeat(${periods.length}, minmax(${colMinWidth}, 1fr))`;

  const renderBar = (item: WorkItem, color: string, borderColor: string, showStatus = false) => {
    const pos = getPosition(item, periods);

    if (!pos) {
      // No dates or out of range – show a subtle placeholder spanning column 1
      return (
        <div
          className="rounded-md p-2 border border-dashed border-muted-foreground/30 bg-muted/30"
          style={{ gridColumn: "1 / span 1" }}
        >
          <span className="text-xs text-muted-foreground truncate block">{item.title}</span>
        </div>
      );
    }

    return (
      <div
        className={`${color} rounded-md p-2 border-l-4 ${borderColor}`}
        style={{ gridColumn: `${pos.start + 1} / span ${pos.span}` }}
      >
        <div className="flex justify-between items-center gap-1">
          <span className="text-sm font-medium truncate">{item.title}</span>
          {showStatus && (
            <Badge
              variant="outline"
              className={`text-xs flex-shrink-0 ${
                item.status === "TODO"
                  ? "bg-blue-100 text-blue-800"
                  : item.status === "IN_PROGRESS"
                  ? "bg-orange-100 text-orange-800"
                  : item.status === "DONE"
                  ? "bg-green-100 text-green-800"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {item.status === "TODO"
                ? "To Do"
                : item.status === "IN_PROGRESS"
                ? "In Progress"
                : item.status === "DONE"
                ? "Done"
                : item.status?.replace("_", " ") ?? ""}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-white shadow-sm border border-neutral-200">
      <CardHeader className="p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Epics & Features Timeline</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-600">Timeline View:</span>
            <Select value={timeUnit} onValueChange={handleTimeUnitChange}>
              <SelectTrigger className="bg-white border border-neutral-300 text-neutral-700 rounded-md h-8 w-32">
                <SelectValue placeholder="Quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Quarter">Quarter</SelectItem>
                <SelectItem value="Month">Month</SelectItem>
                <SelectItem value="Week">Week</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-0">
        <div className="overflow-x-auto pb-2">
          {/* Timeline header */}
          <div className="flex min-w-max border-b border-neutral-200 pb-3">
            <div className="w-64 flex-shrink-0" />
            <div className="flex-1 grid" style={{ gridTemplateColumns: gridCols }}>
              {periods.map((p, i) => (
                <div key={i} className="text-sm font-medium text-neutral-500">
                  {p.label}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline content */}
          <div className="min-w-max pt-4">
            {epics.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">No epics found for this project.</p>
            )}

            {epics.map(epic => {
              const epicFeatures = getFeaturesForEpic(epic.id);

              return (
                <div key={epic.id} className="mb-8">
                  {/* Epic row */}
                  <div className="flex items-start mb-3">
                    <div className="w-64 flex-shrink-0 pr-4">
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold mr-2">
                          E
                        </div>
                        <div>
                          <h3 className="font-medium">{epic.title}</h3>
                          <div className="flex items-center space-x-1">
                            <p className="text-xs text-neutral-500">{epic.externalId}</p>
                            {multiProject && epic.projectId && (
                              <Badge variant="outline" className="text-xs bg-neutral-100 text-neutral-700 px-1 py-0">
                                {getProjectName(epic.projectId)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 grid" style={{ gridTemplateColumns: gridCols }}>
                      {renderBar(epic, "bg-primary/10", "border-primary", true)}
                    </div>
                  </div>

                  {/* Features under Epic */}
                  <div className="pl-8">
                    {epicFeatures.map(feature => (
                      <div key={feature.id} className="flex items-start mb-2">
                        <div className="w-64 flex-shrink-0 pr-4">
                          <div className="flex items-center">
                            <div className="w-5 h-5 rounded-md bg-neutral-200 flex items-center justify-center text-neutral-700 text-xs font-bold mr-2">
                              F
                            </div>
                            <div>
                              <h4 className="text-sm font-medium">{feature.title}</h4>
                              <div className="flex items-center space-x-1">
                                <p className="text-xs text-neutral-500">{feature.externalId}</p>
                                {multiProject && feature.projectId && (
                                  <Badge variant="outline" className="text-xs bg-neutral-100 text-neutral-700 px-1 py-0">
                                    {getProjectName(feature.projectId)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 grid" style={{ gridTemplateColumns: gridCols }}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {renderBar(feature, "bg-neutral-100", "border-neutral-300")}
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-sm font-medium">{feature.title}</div>
                                <div className="text-xs text-neutral-500">{feature.externalId}</div>
                                {feature.startDate && (
                                  <div className="text-xs mt-1">Start: {String(feature.startDate)}</div>
                                )}
                                {feature.endDate && (
                                  <div className="text-xs">End: {String(feature.endDate)}</div>
                                )}
                                {feature.description && (
                                  <div className="text-xs mt-1 max-w-xs">{feature.description}</div>
                                )}
                                <div className="text-xs mt-1">
                                  Status: {feature.status?.replace("_", " ") ?? ""}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
