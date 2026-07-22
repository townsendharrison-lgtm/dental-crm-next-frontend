"use client";

import React, { useState } from "react";
import type { Workflow, WorkflowStep } from "@/lib/types";
import {
  Zap,
  Plus,
  Trash2,
  Save,
  Clock,
  MessageSquare,
  AlertCircle,
  Play,
  Pause,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Form";

interface AdminWorkflowsViewProps {
  workflows: Workflow[];
  onUpdateWorkflows: (workflows: Workflow[]) => void;
}

function isWorkflowActive(w: Workflow) {
  if (w.isActive !== undefined) return w.isActive;
  if (w.is_active !== undefined) return w.is_active;
  return true;
}

function triggerLabel(trigger: Workflow["trigger"]) {
  return trigger.replace(/_/g, " ");
}

const AdminWorkflowsView: React.FC<AdminWorkflowsViewProps> = ({
  workflows,
  onUpdateWorkflows,
}) => {
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

  const openCreate = () => {
    setEditingWorkflow({
      id: `wf-${Date.now()}`,
      name: "New Workflow",
      trigger: "FIRST_ACCEPTANCE",
      steps: [],
      isActive: true,
      is_active: true,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const handleSave = () => {
    if (!editingWorkflow) return;
    const normalized: Workflow = {
      ...editingWorkflow,
      isActive: isWorkflowActive(editingWorkflow),
      is_active: isWorkflowActive(editingWorkflow),
    };

    if (workflows.find((w) => w.id === editingWorkflow.id)) {
      onUpdateWorkflows(workflows.map((w) => (w.id === editingWorkflow.id ? normalized : w)));
    } else {
      onUpdateWorkflows([...workflows, normalized]);
    }
    setEditingWorkflow(null);
  };

  const handleDelete = (id: string) => {
    onUpdateWorkflows(workflows.filter((w) => w.id !== id));
  };

  const toggleActive = (id: string) => {
    onUpdateWorkflows(
      workflows.map((w) => {
        if (w.id !== id) return w;
        const next = !isWorkflowActive(w);
        return { ...w, isActive: next, is_active: next };
      }),
    );
  };

  const addStep = () => {
    if (!editingWorkflow) return;
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      type: "SEND_MESSAGE",
      delayHours: 1,
      messageTemplate: "",
      isFollowUp: editingWorkflow.steps.length > 0,
    };
    setEditingWorkflow({
      ...editingWorkflow,
      steps: [...editingWorkflow.steps, newStep],
    });
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    if (!editingWorkflow) return;
    setEditingWorkflow({
      ...editingWorkflow,
      steps: editingWorkflow.steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
    });
  };

  const removeStep = (stepId: string) => {
    if (!editingWorkflow) return;
    setEditingWorkflow({
      ...editingWorkflow,
      steps: editingWorkflow.steps.filter((s) => s.id !== stepId),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white">Automation Workflows</h3>
        {!editingWorkflow && (
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Create Workflow
          </Button>
        )}
      </div>

      {editingWorkflow ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <Input
                  value={editingWorkflow.name}
                  onChange={(e) =>
                    setEditingWorkflow({ ...editingWorkflow, name: e.target.value })
                  }
                  className="font-semibold"
                />
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
                  Workflow configuration
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="secondary" size="sm" onClick={() => setEditingWorkflow(null)}>
                Cancel
              </Button>
              <Button size="sm" leftIcon={<Save className="w-4 h-4" />} onClick={handleSave}>
                Save Workflow
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-6">
            <section className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-emerald-400" /> 1. Select Trigger
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(
                  [
                    {
                      id: "FIRST_ACCEPTANCE",
                      label: "First Acceptance",
                      desc: "When a student marks their first school as accepted.",
                    },
                    {
                      id: "APPLICATION_SUBMITTED",
                      label: "App Submitted",
                      desc: "When an application status becomes Applied.",
                    },
                    {
                      id: "INTERVIEW_RECEIVED",
                      label: "Interview Invite",
                      desc: "When an interview invitation is logged.",
                    },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setEditingWorkflow({ ...editingWorkflow, trigger: t.id })
                    }
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      editingWorkflow.trigger === t.id
                        ? "bg-indigo-600/10 border-indigo-500/50"
                        : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <p
                      className={`font-semibold text-sm mb-1 ${
                        editingWorkflow.trigger === t.id ? "text-indigo-400" : "text-white"
                      }`}
                    >
                      {t.label}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> 2. Sequence Steps
                </h4>
                <button
                  type="button"
                  onClick={addStep}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Step
                </button>
              </div>

              <div className="space-y-3">
                {editingWorkflow.steps.map((step, idx) => (
                  <div key={step.id} className="relative pl-8">
                    {idx < editingWorkflow.steps.length - 1 && (
                      <div className="absolute left-[15px] top-10 bottom-0 w-0.5 bg-slate-800" />
                    )}
                    <div className="absolute left-0 top-2 w-8 h-8 rounded-full bg-slate-800 border-4 border-slate-950 flex items-center justify-center text-[10px] font-bold text-slate-500 z-10">
                      {idx + 1}
                    </div>

                    <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Delay:
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={step.delayHours}
                              onChange={(e) =>
                                updateStep(step.id, {
                                  delayHours: Math.max(0, Number(e.target.value)),
                                })
                              }
                              className="w-12 bg-transparent text-white font-bold text-xs focus:outline-none"
                            />
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                step.delayHours === 0 ? "text-emerald-400" : "text-slate-500"
                              }`}
                            >
                              {step.delayHours === 0 ? "Immediate" : "Hours"}
                            </span>
                          </div>
                          {step.isFollowUp && (
                            <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                              <AlertCircle className="w-3 h-3 text-amber-500" />
                              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                                Follow-up step
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeStep(step.id)}
                          className="p-2 text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
                          aria-label="Remove step"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <FormField label="Message Template">
                        <Textarea
                          value={step.messageTemplate}
                          onChange={(e) =>
                            updateStep(step.id, { messageTemplate: e.target.value })
                          }
                          placeholder="Congrats [Mentee Name]! Great news about [School]."
                          rows={3}
                        />
                        <p className="text-[10px] text-slate-600 italic mt-1">
                          Placeholders:{" "}
                          <span className="text-indigo-400/70">[Mentee Name]</span>,{" "}
                          <span className="text-indigo-400/70">[School]</span>,{" "}
                          <span className="text-indigo-400/70">[Mentor Name]</span>
                        </p>
                      </FormField>
                    </div>
                  </div>
                ))}

                {editingWorkflow.steps.length === 0 && (
                  <div className="py-10 border border-dashed border-slate-800 rounded-xl text-center text-sm text-slate-500">
                    <MessageSquare className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                    No steps yet. Add a message step to get started.
                    <div className="mt-3">
                      <Button size="sm" variant="secondary" onClick={addStep}>
                        Add First Step
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {workflows.map((workflow) => {
            const active = isWorkflowActive(workflow);
            return (
              <div
                key={workflow.id}
                className={`p-4 bg-slate-900 border rounded-xl flex items-center justify-between gap-3 transition-all ${
                  active
                    ? "border-slate-800 hover:border-indigo-500/30"
                    : "border-slate-900 opacity-60"
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? "bg-indigo-600/10 text-indigo-400" : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-white truncate">{workflow.name}</h4>
                      <span className="px-2 py-0.5 bg-slate-800 text-[9px] font-bold text-slate-400 uppercase tracking-wider rounded-md border border-slate-700">
                        {triggerLabel(workflow.trigger)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                          active
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-slate-500/20 text-slate-400"
                        }`}
                      >
                        {active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {workflow.steps?.length || 0} steps
                      {(workflow.createdAt || workflow.created_at) &&
                        ` · Created ${new Date(
                          (workflow.createdAt || workflow.created_at) as string,
                        ).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleActive(workflow.id)}
                    className={`p-2 rounded-lg transition-all border cursor-pointer ${
                      active
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20"
                        : "bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700"
                    }`}
                    title={active ? "Deactivate" : "Activate"}
                  >
                    {active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingWorkflow(workflow)}
                    className="p-2 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                    aria-label="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(workflow.id)}
                    className="p-2 bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {workflows.length === 0 && (
            <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl text-sm text-slate-500">
              <Zap className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              No workflows yet. Create one to message students at key milestones.
              <div className="mt-4">
                <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
                  Create Your First Workflow
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminWorkflowsView;
