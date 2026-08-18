import type { Ref } from 'vue'

/** Inserts a `{variable}` token at the caret of a textarea, restoring focus/selection afterwards. */
export function useVariableInsert(value: Ref<string>, textareaRef: Ref<HTMLTextAreaElement | null>) {
  function insert(variable: string) {
    const token = `{${variable}}`
    const textarea = textareaRef.value
    if (!textarea) {
      value.value += token
      return
    }

    const start = textarea.selectionStart ?? value.value.length
    const end = textarea.selectionEnd ?? value.value.length
    value.value = `${value.value.slice(0, start)}${token}${value.value.slice(end)}`

    nextTick(() => {
      textarea.focus()
      const caret = start + token.length
      textarea.setSelectionRange(caret, caret)
    })
  }

  return { insert }
}
