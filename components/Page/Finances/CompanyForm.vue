<template>
  <div class="flex flex-col h-full">
    <div class="flex-1 overflow-y-auto space-y-6">

      <section>
        <h3 class="section-title">Persönliche Daten</h3>

        <div class="space-y-2">
          <div class="field">
            <label>Firma*</label>
            <input v-model="form.name" class="input" required />
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div class="field col-span-2">
              <label>Straße</label>
              <input v-model="form.street" class="input" />
            </div>

            <div class="field">
              <label>Nr.</label>
              <input v-model="form.street_number" class="input"/>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div class="field">
              <label>PLZ</label>
              <input v-model="form.postal_code" class="input" />
            </div>

            <div class="field col-span-2">
              <label>Ort</label>
              <input v-model="form.city" class="input" />
            </div>
          </div>

          <div class="field">
            <label>Land</label>
            <input v-model="form.country" class="input" />
          </div>
        </div>
      </section>

      <section>
        <h3 class="section-title">Kontaktdaten</h3>

        <div class="grid grid-cols-2 gap-3">
          <div class="field">
            <label>E-Mail</label>
            <input v-model="form.email" class="input" />
          </div>

          <div class="field">
            <label>Telefon</label>
            <input v-model="form.phone" class="input" />
          </div>
        </div>
      </section>

      <section>
        <h3 class="section-title">Bankverbindung</h3>

        <div class="space-y-2">
          <div class="grid grid-cols-2 gap-3">
            <div class="field">
              <label>IBAN</label>
              <input v-model="form.iban" class="input" />
            </div>

            <div class="field">
              <label>BIC</label>
              <input v-model="form.bic" class="input" />
            </div>
          </div>

          <div class="field">
            <label>Bankname</label>
            <input v-model="form.bankname" class="input" />
          </div>
        </div>
      </section>

      <section>
        <h3 class="section-title">Steuerdaten</h3>

        <div class="field">
          <label>USt-ID</label>
          <input v-model="form.vat_id" class="input" />
        </div>
      </section>

      <section>
        <h3 class="section-title">Notizen</h3>

        <textarea
          v-model="form.notes"
          rows="3"
          class="input resize-none"
        />
      </section>
    </div>

    <div class="pt-4 flex justify-end gap-3 bg-white">
      <button
        type="button"
        @click="$emit('cancel')"
        class="btn-secondary"
      >
        Abbrechen
      </button>

      <button
        type="button"
        @click="save"
        class="btn-primary"
      >
        Speichern
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">  
import type { Company, UpdateCompanyBody } from '~/types/company'
  
const props = defineProps<{
  modelValue: Company
}>()
  
const emit = defineEmits<{
  (e: 'update:modelValue', value: Company): void
  (e: 'save'): void
  (e: 'cancel'): void
}>()
  
const form = reactive<UpdateCompanyBody>({
  id: props.modelValue.id,
  name: props.modelValue.name,
  street: props.modelValue.street ?? null,
  street_number: props.modelValue.street_number ?? null,
  postal_code: props.modelValue.postal_code ?? null,
  city: props.modelValue.city ?? null,
  country: props.modelValue.country ?? "Deutschland",
  iban: props.modelValue.iban ?? null,
  bic: props.modelValue.bic ?? null,
  bankname: props.modelValue.bankname ?? null,
  vat_id: props.modelValue.vat_id ?? null,
  email: props.modelValue.email ?? null,
  phone: props.modelValue.phone ?? null,
  notes: props.modelValue.notes ?? null
})
  
watch(
  () => props.modelValue,
  (v) => Object.assign(form, {
    ...v,
    country: v.country ?? form.country ?? "Deutschland"
  }),
  { immediate: true, deep: true }
)

function updateModelValueFromForm() {
  const updated: Partial<Company> = {}
  const keys = Object.keys(form) as (keyof UpdateCompanyBody)[]

  keys.forEach((key) => {
    const value = form[key]
    if (value !== null && value !== undefined) {
      updated[key as keyof Company] = value as any
    }
  })

  emit('update:modelValue', {
    ...props.modelValue,
    ...updated
  })
}

async function save() {
  const res = await $fetch(`/api/companies/${form.id}`, {
    method: 'PUT',
    body: form
  })
  if (res.ok) updateModelValueFromForm()
  emit('save')
}
</script>