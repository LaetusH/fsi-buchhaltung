import { useI18n } from '~/composables/useI18n'
import { useToast } from '~/composables/useToast'
import type { EventTask as PersistedEventTask, SaveEventTask } from '~/types/event'
import type { GetEventTasksResponse } from '~/server/api/events/[id]/tasks/index.get'
import type { UpdateEventTasksResponse } from '~/server/api/events/[id]/tasks/index.put'
import type { EventPlanningTask } from '~/components/Page/Events/planning/types'

export function useEventTasks(eventId: Ref<number | null>) {
  const { t } = useI18n()
  const toast = useToast()

  const planningTasks = ref<EventPlanningTask[]>([])
  const taskLoading = ref(false)
  const taskSaving = ref(false)
  const canManageTasks = ref(false)

  function mapPersistedTaskToPanel(task: PersistedEventTask): EventPlanningTask {
    return {
      id: task.id,
      title: task.title,
      deadline: task.deadline,
      status: task.status,
      memberIds: task.members.map(m => m.id),
      subdivisionIds: task.subdivisions.map(s => s.id),
      linkedChecklistId: task.linkedChecklistId,
      linkedChecklistProgress: task.linkedChecklistProgress,
    }
  }

  function mapPanelTaskToPayload(task: EventPlanningTask, position: number): SaveEventTask {
    return {
      ...(task.id > 0 ? { id: task.id } : {}),
      title: task.title,
      status: task.status,
      deadline: task.deadline,
      position,
      member_ids: task.memberIds,
      subdivision_ids: task.subdivisionIds,
    }
  }

  async function loadEventTasks(id: number) {
    if (taskLoading.value) return

    try {
      taskLoading.value = true
      const res = await $fetch<GetEventTasksResponse>(`/api/events/${id}/tasks`)
      if (!res.ok) throw new Error(res.error)

      planningTasks.value = res.tasks.map(mapPersistedTaskToPanel)
      canManageTasks.value = res.canManageTasks
    }
    catch (err: any) {
      toast.error(err?.message || t('event.planning.failedLoadTasks'))
    }
    finally {
      taskLoading.value = false
    }
  }

  async function saveEventTasks(nextTasks: EventPlanningTask[]) {
    if (!eventId.value || taskSaving.value) return

    try {
      taskSaving.value = true
      const res = await $fetch<UpdateEventTasksResponse>(`/api/events/${eventId.value}/tasks`, {
        method: 'PUT',
        body: { tasks: nextTasks.map((task, i) => mapPanelTaskToPayload(task, i)) },
      })
      if (!res.ok) throw new Error(res.error)

      planningTasks.value = res.tasks.map(mapPersistedTaskToPanel)
    }
    catch (err: any) {
      toast.error(err?.message || t('event.planning.failedSaveTasks'))
      if (eventId.value) await loadEventTasks(eventId.value)
    }
    finally {
      taskSaving.value = false
    }
  }

  function reset() {
    planningTasks.value = []
    canManageTasks.value = false
  }

  return {
    planningTasks,
    taskLoading,
    taskSaving,
    canManageTasks,
    loadEventTasks,
    saveEventTasks,
    reset,
  }
}
