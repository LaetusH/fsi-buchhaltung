import { useI18n } from '~/composables/useI18n'
import { useToast } from '~/composables/useToast'
import type {
  EventChecklist as PersistedEventChecklist,
  EventChecklistTemplate as PersistedEventChecklistTemplate,
  SaveEventChecklist,
  SaveEventChecklistTemplate,
} from '~/types/event'
import type { GetEventChecklistsResponse } from '~/server/api/events/[id]/checklists/index.get'
import type { UpdateEventChecklistsResponse } from '~/server/api/events/[id]/checklists/index.put'
import type { UpdateEventChecklistTemplatesResponse } from '~/server/api/events/checklist-templates/index.put'
import type { PlanningChecklist } from '~/components/Page/Events/planning/types'

export function useEventChecklists(eventId: Ref<number | null>) {
  const { t } = useI18n()
  const toast = useToast()

  const reusableChecklists = ref<PlanningChecklist[]>([])
  const checklistTemplates = ref<PlanningChecklist[]>([])
  const checklistLoading = ref(false)
  const checklistSaving = ref(false)
  const canManageChecklists = ref(false)

  function mapPersistedChecklistToPanel(checklist: PersistedEventChecklist): PlanningChecklist {
    return {
      id: checklist.id,
      title: checklist.title,
      description: checklist.description,
      items: checklist.items.map(item => ({
        id: item.id,
        label: item.label,
        done: item.done,
      })),
    }
  }

  function mapPersistedChecklistTemplateToPanel(template: PersistedEventChecklistTemplate): PlanningChecklist {
    return {
      id: template.id,
      title: template.title,
      description: template.description,
      items: template.items.map(item => ({
        id: item.id,
        label: item.label,
        done: false,
      })),
    }
  }

  function mapPanelChecklistToPayload(checklist: PlanningChecklist): SaveEventChecklist {
    return {
      ...(checklist.id > 0 ? { id: checklist.id } : {}),
      title: checklist.title,
      description: checklist.description,
      items: checklist.items.map(item => ({
        ...(item.id > 0 ? { id: item.id } : {}),
        label: item.label,
        done: item.done,
      })),
    }
  }

  function mapPanelChecklistTemplateToPayload(template: PlanningChecklist): SaveEventChecklistTemplate {
    return {
      ...(template.id > 0 ? { id: template.id } : {}),
      title: template.title,
      description: template.description,
      items: template.items.map(item => ({
        ...(item.id > 0 ? { id: item.id } : {}),
        label: item.label,
        done: false,
      })),
    }
  }

  async function loadEventChecklists(id: number) {
    if (checklistLoading.value) return

    try {
      checklistLoading.value = true
      const res = await $fetch<GetEventChecklistsResponse>(`/api/events/${id}/checklists`)
      if (!res.ok) throw new Error(res.error)

      reusableChecklists.value = res.checklists.map(mapPersistedChecklistToPanel)
      checklistTemplates.value = res.templates.map(mapPersistedChecklistTemplateToPanel)
      canManageChecklists.value = res.canManageChecklists
    }
    catch (err: any) {
      toast.error(err?.message || t('event.planning.failedLoadChecklists'))
    }
    finally {
      checklistLoading.value = false
    }
  }

  async function saveEventChecklists(nextChecklists: PlanningChecklist[]) {
    if (!eventId.value || checklistSaving.value) return

    try {
      checklistSaving.value = true
      const res = await $fetch<UpdateEventChecklistsResponse>(`/api/events/${eventId.value}/checklists`, {
        method: 'PUT',
        body: { checklists: nextChecklists.map(mapPanelChecklistToPayload) },
      })
      if (!res.ok) throw new Error(res.error)

      reusableChecklists.value = res.checklists.map(mapPersistedChecklistToPanel)
    }
    catch (err: any) {
      toast.error(err?.message || t('event.planning.failedSaveChecklists'))
      if (eventId.value) await loadEventChecklists(eventId.value)
    }
    finally {
      checklistSaving.value = false
    }
  }

  async function saveEventChecklistTemplates(nextTemplates: PlanningChecklist[]) {
    if (!eventId.value || checklistSaving.value) return

    try {
      checklistSaving.value = true
      const res = await $fetch<UpdateEventChecklistTemplatesResponse>('/api/events/checklist-templates', {
        method: 'PUT',
        body: { templates: nextTemplates.map(mapPanelChecklistTemplateToPayload) },
      })
      if (!res.ok) throw new Error(res.error)

      checklistTemplates.value = res.templates.map(mapPersistedChecklistTemplateToPanel)
    }
    catch (err: any) {
      toast.error(err?.message || t('event.planning.failedSaveChecklists'))
      if (eventId.value) await loadEventChecklists(eventId.value)
    }
    finally {
      checklistSaving.value = false
    }
  }

  function reset() {
    reusableChecklists.value = []
    checklistTemplates.value = []
    canManageChecklists.value = false
  }

  return {
    reusableChecklists,
    checklistTemplates,
    checklistLoading,
    checklistSaving,
    canManageChecklists,
    loadEventChecklists,
    saveEventChecklists,
    saveEventChecklistTemplates,
    reset,
  }
}
