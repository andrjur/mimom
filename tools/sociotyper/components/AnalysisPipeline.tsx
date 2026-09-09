import React from 'react';
import { Check, LoaderCircle, ShieldAlert } from 'lucide-react';
import type { PipelineStage } from '../typistTypes';

export const AnalysisPipeline: React.FC<{ stages: PipelineStage[]; compact?: boolean }> = ({ stages, compact }) => (
  <div className={`tw-pipeline ${compact ? 'is-compact' : ''}`} aria-label="Этапы анализа">
    {stages.map((stage, index) => (
      <React.Fragment key={stage.id}>
        <div className={`tw-stage ${stage.status}`}>
          <span className="tw-stage-icon">
            {stage.status === 'done' ? <Check size={16} /> : stage.status === 'running' ? <LoaderCircle size={16} className="tw-spin" /> : stage.status === 'warning' ? <ShieldAlert size={16} /> : index + 1}
          </span>
          <div><strong>{stage.label}</strong><small>{stage.provider ? `${stage.provider} · ` : ''}{stage.model || stage.note || 'ожидает'}</small></div>
        </div>
        {index < stages.length - 1 && <span className="tw-stage-line" />}
      </React.Fragment>
    ))}
  </div>
);
