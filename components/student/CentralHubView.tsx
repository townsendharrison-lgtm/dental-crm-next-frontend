"use client";

import React, { useState } from "react";
import type { CentralHubViewProps } from "./hub/hubShared";
import type { HubTabId } from "./hub/HubTabShell";
import HubTabShell from "./hub/HubTabShell";
import HourTrackerTab from "./hub/HourTrackerTab";
import AnalyticsTab from "./hub/AnalyticsTab";
import SchoolSelectionTab from "./hub/SchoolSelectionTab";
import ImprovementTab from "./hub/ImprovementTab";
import TimelineTab from "./hub/TimelineTab";

const CentralHubView: React.FC<CentralHubViewProps> = ({
  student,
  experiences,
  onUpdateExperiences,
  improvementGoals: _improvementGoals = [],
  milestones = [],
  onUpdateMilestones,
  onUpdateGoal: _onUpdateGoal,
  onDeleteGoal: _onDeleteGoal,
  optimizationPlan,
  isMentorView = false,
  initialTab = "tracker",
  onUpdateSchools,
  onUpdateStudent,
  onUpdateApplications,
  platformConfig,
  hideShell = false,
}) => {
  const [activeTab, setActiveTab] = useState<HubTabId>(
    (initialTab as HubTabId) || "tracker",
  );

  React.useEffect(() => {
    if (initialTab) setActiveTab(initialTab as HubTabId);
  }, [initialTab]);

  const content = (
    <>
      {activeTab === "tracker" && (
        <HourTrackerTab
          student={student}
          experiences={experiences}
          onUpdateExperiences={onUpdateExperiences}
        />
      )}
      {activeTab === "analytics" && (
        <AnalyticsTab
          student={student}
          experiences={experiences}
          optimizationPlan={optimizationPlan}
        />
      )}
      {activeTab === "schools" && (
        <SchoolSelectionTab
          student={student}
          isMentorView={isMentorView}
          onUpdateSchools={onUpdateSchools}
          onUpdateStudent={onUpdateStudent}
          onUpdateApplications={onUpdateApplications}
          platformConfig={platformConfig}
        />
      )}
      {activeTab === "improvement" && (
        <ImprovementTab
          student={student}
          experiences={experiences}
          optimizationPlan={optimizationPlan}
          isMentorView={isMentorView}
        />
      )}
      {activeTab === "timeline" && (
        <TimelineTab
          student={student}
          milestones={milestones}
          onUpdateMilestones={onUpdateMilestones}
          onUpdateStudent={onUpdateStudent}
        />
      )}
    </>
  );

  if (hideShell) {
    return <div className="text-slate-300">{content}</div>;
  }

  return (
    <div className="text-slate-300">
      <HubTabShell activeTab={activeTab} onTabChange={setActiveTab}>
        <div className="pt-2">{content}</div>
      </HubTabShell>
    </div>
  );
};

export default CentralHubView;
export type { CentralHubViewProps };
