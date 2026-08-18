import type { Ref } from 'vue'
import { applyFormatAction, type FormatActionKey } from '~/utils/notificationFormatting'

/** Wires a `TextFormatToolbar` action to a textarea + its bound value ref, restoring focus/selection after applying it. */
export function useTextFormatting(value: Ref<string>, textareaRef: Ref<HTMLTextAreaElement | null>) {
  function apply(key: FormatActionKey) {
    const textarea = textareaRef.value
    const start = textarea?.selectionStart ?? value.value.length
    const end = textarea?.selectionEnd ?? value.value.length
    const result = applyFormatAction(key, value.value, start, end)
    value.value = result.value

    nextTick(() => {
      textarea?.focus()
      textarea?.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }

  return { apply }
}
