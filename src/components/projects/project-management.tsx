import {
  CalendarDays,
  PencilLine,
  Target,
  Droplets,
  Archive,
} from "lucide-react";
import type { Project } from "@/lib/domain";
import { today } from "@/lib/domain";
import { ProjectSetting } from "@/components/project-setting";
import { ProjectGoalFields } from "@/components/project-fields";
import { ProjectDeleteDialog } from "@/components/project-delete-dialog";
import { ProjectDialog, ProjectActionForm } from "./project-dialog";
import {
  changeProject,
  changeWaterGoal,
  changeGoals,
  changeDraftDates,
} from "@/app/painel/projetos/actions";

export function ProjectManagement({ project: p }: { project: Project }) {
  return (
    <ProjectDialog
      id={`project-manage-${p.id}`}
      title={`Gerenciar projeto: ${p.name}`}
    >
      {(p.status === "COMPLETED" || p.status === "ARCHIVED") && (
        <p className="intro">
          Projeto somente leitura. Seus registros permanecem disponíveis para
          consulta. A exclusão definitiva exige confirmação separada.
        </p>
      )}
      {(p.status === "DRAFT" || p.status === "ACTIVE") && (
        <>
          <div className="project-settings">
            {p.status === "DRAFT" && (
              <ProjectSetting
                title="Editar datas do rascunho"
                icon={CalendarDays}
              >
                <p className="intro">
                  O período deve incluir as metas de água já configuradas. Após
                  ativar, as datas ficam fixas.
                </p>
                <ProjectActionForm
                  action={changeDraftDates}
                  submit="Salvar datas"
                >
                  <input type="hidden" name="id" value={p.id} />
                  <label>
                    Início do rascunho
                    <input
                      type="date"
                      name="starts_on"
                      required
                      defaultValue={p.starts_on}
                    />
                  </label>
                  <label>
                    Fim previsto do rascunho (opcional)
                    <input
                      type="date"
                      name="ends_on"
                      defaultValue={p.ends_on ?? ""}
                    />
                  </label>
                </ProjectActionForm>
              </ProjectSetting>
            )}
            <ProjectSetting title="Editar nome" icon={PencilLine}>
              <ProjectActionForm action={changeProject} submit="Atualizar nome">
                <input type="hidden" name="id" value={p.id} />
                <label>
                  Nome
                  <input
                    name="name"
                    required
                    maxLength={100}
                    defaultValue={p.name}
                  />
                </label>
              </ProjectActionForm>
            </ProjectSetting>
            <ProjectSetting
              title="Editar metas de peso e atividades"
              icon={Target}
            >
              <ProjectActionForm action={changeGoals} submit="Salvar metas">
                <input type="hidden" name="id" value={p.id} />
                <ProjectGoalFields
                  mode={p.weight_mode}
                  min={p.weight_min}
                  max={p.weight_max}
                />
                <label>
                  Sessões por semana
                  <input
                    type="number"
                    name="sessions"
                    min={1}
                    max={50}
                    defaultValue={p.sessions_goal ?? ""}
                  />
                </label>
              </ProjectActionForm>
            </ProjectSetting>
            <ProjectSetting title="Configurar meta de água" icon={Droplets}>
              <ProjectActionForm action={changeWaterGoal} submit="Salvar meta">
                <input type="hidden" name="project_id" value={p.id} />
                <label>
                  Vigente a partir de
                  <input
                    type="date"
                    name="effective_from"
                    required
                    min={p.status === "ACTIVE" ? today() : p.starts_on}
                    defaultValue={p.status === "DRAFT" ? p.starts_on : today()}
                  />
                </label>
                <label>
                  Meta (ml)
                  <input
                    name="target_ml"
                    type="number"
                    required
                    min={100}
                    max={15000}
                  />
                </label>
              </ProjectActionForm>
            </ProjectSetting>
          </div>
          <ProjectActionForm
            className="data-form project-state-action"
            action={changeProject}
            submit={
              p.status === "DRAFT" ? "Ativar projeto" : "Concluir projeto"
            }
          >
            <input type="hidden" name="id" value={p.id} />
            <input
              type="hidden"
              name="status"
              value={p.status === "DRAFT" ? "ACTIVE" : "COMPLETED"}
            />
            {p.status === "ACTIVE" && (
              <label className="checkbox-label">
                <input name="confirm" type="checkbox" required />
                Entendo que o projeto ficará somente leitura.
              </label>
            )}
          </ProjectActionForm>
          <ProjectSetting title="Arquivar projeto" icon={Archive}>
            <ProjectActionForm
              action={changeProject}
              submit="Confirmar arquivamento"
            >
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="status" value="ARCHIVED" />
              <label className="checkbox-label">
                <input name="confirm" type="checkbox" required />
                Entendo que o projeto ficará somente leitura.
              </label>
            </ProjectActionForm>
          </ProjectSetting>
        </>
      )}

      <ProjectDeleteDialog
        id={p.id}
        name={p.name}
        active={p.status === "ACTIVE"}
      />
    </ProjectDialog>
  );
}
