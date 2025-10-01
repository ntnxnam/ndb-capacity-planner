'use client';

import React from 'react';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';

interface ReleasePlan {
  id: string;
  name: string;
  ga_date?: string;
  feature_complete_expected_date?: string;
  promotion_gate_met_date?: string;
  commit_gate_met_date?: string;
  soft_code_complete_date?: string;
  execute_commit_date?: string;
  concept_commit_date?: string;
  pre_cc_complete_date?: string;
}

interface GanttChartProps {
  plans: ReleasePlan[];
}

interface Milestone {
  name: string;
  date?: string;
  color: string;
  order: number;
}

export function GanttChart({ plans }: GanttChartProps) {
  if (plans.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No release plans available to display in Gantt chart.</p>
        <p className="text-sm mt-2">Create a release plan to see the timeline visualization.</p>
      </div>
    );
  }

  // Define milestones in order
  const milestones: Milestone[] = [
    { name: 'Pre-CC Complete', color: 'bg-red-500', order: 1 },
    { name: 'Concept Commit', color: 'bg-orange-500', order: 2 },
    { name: 'Execute Commit', color: 'bg-yellow-500', order: 3 },
    { name: 'Soft Code Complete', color: 'bg-green-500', order: 4 },
    { name: 'Commit Gate Met', color: 'bg-blue-500', order: 5 },
    { name: 'Promotion Gate Met', color: 'bg-indigo-500', order: 6 },
    { name: 'Feature Complete', color: 'bg-purple-500', order: 7 },
    { name: 'GA Date', color: 'bg-pink-500', order: 8 }
  ];

  // Get all dates and find the range
  const allDates = plans.flatMap(plan => [
    plan.pre_cc_complete_date,
    plan.concept_commit_date,
    plan.execute_commit_date,
    plan.soft_code_complete_date,
    plan.commit_gate_met_date,
    plan.promotion_gate_met_date,
    plan.feature_complete_expected_date,
    plan.ga_date
  ]).filter(Boolean) as string[];

  if (allDates.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No milestone dates available to display in Gantt chart.</p>
        <p className="text-sm mt-2">Add dates to release plans to see the timeline visualization.</p>
      </div>
    );
  }

  const sortedDates = allDates.sort();
  const startDate = parseISO(sortedDates[0]);
  const endDate = parseISO(sortedDates[sortedDates.length - 1]);
  const totalDays = differenceInDays(endDate, startDate) + 1;

  // Helper function to get milestone date for a plan
  const getMilestoneDate = (plan: ReleasePlan, milestoneName: string): string | undefined => {
    switch (milestoneName) {
      case 'Pre-CC Complete': return plan.pre_cc_complete_date;
      case 'Concept Commit': return plan.concept_commit_date;
      case 'Execute Commit': return plan.execute_commit_date;
      case 'Soft Code Complete': return plan.soft_code_complete_date;
      case 'Commit Gate Met': return plan.commit_gate_met_date;
      case 'Promotion Gate Met': return plan.promotion_gate_met_date;
      case 'Feature Complete': return plan.feature_complete_expected_date;
      case 'GA Date': return plan.ga_date;
      default: return undefined;
    }
  };

  // Helper function to calculate position and width for a milestone
  const getMilestonePosition = (date: string) => {
    const milestoneDate = parseISO(date);
    const daysFromStart = differenceInDays(milestoneDate, startDate);
    const position = (daysFromStart / totalDays) * 100;
    return Math.max(0, Math.min(100, position));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Release Timeline (Gantt Chart)</h3>
        <p className="text-sm text-gray-600 mt-1">
          Visual representation of release milestones across all plans
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Header with dates */}
          <div className="flex border-b border-gray-200">
            <div className="w-48 p-3 bg-gray-50 border-r border-gray-200">
              <span className="text-sm font-medium text-gray-700">Release Plan</span>
            </div>
            <div className="flex-1 relative">
              <div className="flex justify-between text-xs text-gray-500 p-2">
                <span>{format(startDate, 'MMM dd, yyyy')}</span>
                <span>{format(endDate, 'MMM dd, yyyy')}</span>
              </div>
            </div>
          </div>

          {/* Plan rows */}
          {plans.map((plan, planIndex) => (
            <div key={plan.id} className="flex border-b border-gray-100 hover:bg-gray-50">
              {/* Plan name */}
              <div className="w-48 p-3 border-r border-gray-200">
                <div className="text-sm font-medium text-gray-900 truncate" title={plan.name}>
                  {plan.name}
                </div>
                {plan.ga_date && (
                  <div className="text-xs text-gray-500 mt-1">
                    GA: {format(parseISO(plan.ga_date), 'MMM dd, yyyy')}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="flex-1 relative h-16">
                <div className="absolute inset-0 flex items-center">
                  {/* Background grid lines */}
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: Math.ceil(totalDays / 7) }, (_, i) => (
                      <div
                        key={i}
                        className="border-r border-gray-100"
                        style={{ width: `${100 / Math.ceil(totalDays / 7)}%` }}
                      />
                    ))}
                  </div>

                  {/* Milestone bars */}
                  {milestones.map((milestone) => {
                    const milestoneDate = getMilestoneDate(plan, milestone.name);
                    if (!milestoneDate) return null;

                    const position = getMilestonePosition(milestoneDate);
                    const isLast = milestone.order === milestones.length;
                    const nextMilestone = milestones.find(m => m.order === milestone.order + 1);
                    const nextDate = nextMilestone ? getMilestoneDate(plan, nextMilestone.name) : null;
                    
                    let width = 5; // Default width for single milestone
                    if (nextDate) {
                      const nextPosition = getMilestonePosition(nextDate);
                      width = Math.max(5, nextPosition - position);
                    } else if (milestone.order === milestones.length) {
                      // Last milestone gets remaining space
                      width = Math.max(5, 100 - position);
                    }

                    return (
                      <div
                        key={milestone.name}
                        className={`absolute h-6 rounded ${milestone.color} shadow-sm flex items-center justify-center`}
                        style={{
                          left: `${position}%`,
                          width: `${width}%`,
                          zIndex: 10
                        }}
                        title={`${milestone.name}: ${format(parseISO(milestoneDate), 'MMM dd, yyyy')}`}
                      >
                        <span className="text-xs text-white font-medium truncate px-1">
                          {milestone.name.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-wrap gap-4">
              <span className="text-sm font-medium text-gray-700">Milestones:</span>
              {milestones.map((milestone) => (
                <div key={milestone.name} className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded ${milestone.color}`} />
                  <span className="text-xs text-gray-600">{milestone.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

